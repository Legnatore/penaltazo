<?php
/**
 * ¡PENALTAZO! - API de Torneos Eliminatorios en PHP
 */

require_once __DIR__ . '/common.php';
require_once __DIR__ . '/tournament_helper.php';

initDataDirs();
$req = getRequestData();
$action = $req['action'] ?? '';

switch ($action) {
    case 'create_tournament':
        $tournamentId = generateTournamentId();
        $size = (int)($req['size'] ?? 8);
        $size = in_array($size, [4, 8, 16], true) ? $size : 8;
        $name = trim($req['name'] ?? 'Copa Penaltazo') ?: 'Copa Penaltazo';
        $playerName = trim($req['playerName'] ?? 'Anfitrión') ?: 'Anfitrión';
        $penalties = (int)($req['penaltiesPerPlayer'] ?? 5);
        $clientId = trim($req['clientId'] ?? ('cid_' . bin2hex(random_bytes(4))));

        $tournament = [
            'id' => $tournamentId,
            'name' => $name,
            'size' => $size,
            'penaltiesPerPlayer' => $penalties,
            'status' => 'lobby',
            'hostClientId' => $clientId,
            'participants' => [
                [
                    'id' => $clientId,
                    'clientId' => $clientId,
                    'name' => $playerName,
                    'isBot' => false,
                    'isHost' => true,
                    'connected' => true
                ]
            ],
            'bracket' => [],
            'currentRoundIndex' => 0,
            'champion' => null,
            'runnerUp' => null,
            'events' => [],
            'eventSeq' => 0
        ];

        pushEvent($tournament, 'tournament_joined', [
            'tournament' => sanitizeTournament($tournament),
            'participant' => $tournament['participants'][0],
            'isHost' => true
        ]);

        $filePath = getTournamentPath($tournamentId);
        saveJsonLocked($filePath, $tournament);

        jsonResponse([
            'success' => true,
            'tournamentId' => $tournamentId,
            'tournament' => sanitizeTournament($tournament),
            'events' => getEventsSince($tournament, 0),
            'lastSeq' => $tournament['eventSeq']
        ]);
        break;

    case 'join_tournament':
        $tournamentId = trim($req['tournamentId'] ?? '');
        $playerName = trim($req['playerName'] ?? '');
        $clientId = trim($req['clientId'] ?? ('cid_' . bin2hex(random_bytes(4))));

        $filePath = getTournamentPath($tournamentId);
        $fp = null;
        $tournament = loadJsonLocked($filePath, $fp);

        if (!$tournament) {
            jsonResponse(['success' => false, 'error' => 'Torneo no encontrado'], 404);
        }

        // Comprobar si ya estaba dentro
        $existing = null;
        foreach ($tournament['participants'] as &$p) {
            if ($p['clientId'] === $clientId) {
                $existing = &$p;
                break;
            }
        }

        if ($existing) {
            if ($playerName) $existing['name'] = $playerName;
            $existing['connected'] = true;
        } else {
            if ($tournament['status'] !== 'lobby') {
                saveJsonLocked($filePath, $tournament, $fp);
                jsonResponse(['success' => false, 'error' => 'El torneo ya ha comenzado'], 400);
            }
            if (count($tournament['participants']) >= $tournament['size']) {
                saveJsonLocked($filePath, $tournament, $fp);
                jsonResponse(['success' => false, 'error' => 'El torneo ya está completo'], 400);
            }

            $assignedName = $playerName ?: ('Jugador ' . (count($tournament['participants']) + 1));
            $tournament['participants'][] = [
                'id' => $clientId,
                'clientId' => $clientId,
                'name' => $assignedName,
                'isBot' => false,
                'isHost' => false,
                'connected' => true
            ];
        }

        pushEvent($tournament, 'tournament_updated', sanitizeTournament($tournament));
        saveJsonLocked($filePath, $tournament, $fp);

        jsonResponse([
            'success' => true,
            'tournament' => sanitizeTournament($tournament),
            'events' => getEventsSince($tournament, (int)($req['sinceSeq'] ?? 0)),
            'lastSeq' => $tournament['eventSeq']
        ]);
        break;

    case 'leave_tournament':
        $tournamentId = trim($req['tournamentId'] ?? '');
        $clientId = trim($req['clientId'] ?? '');

        $filePath = getTournamentPath($tournamentId);
        $fp = null;
        $tournament = loadJsonLocked($filePath, $fp);

        if ($tournament && $tournament['status'] === 'lobby') {
            $newParticipants = [];
            $wasHost = false;
            foreach ($tournament['participants'] as $p) {
                if ($p['clientId'] === $clientId) {
                    if (!empty($p['isHost'])) $wasHost = true;
                } else {
                    $newParticipants[] = $p;
                }
            }
            $tournament['participants'] = $newParticipants;

            if ($wasHost && !empty($tournament['participants'])) {
                $tournament['participants'][0]['isHost'] = true;
                $tournament['hostClientId'] = $tournament['participants'][0]['clientId'];
            }

            pushEvent($tournament, 'tournament_updated', sanitizeTournament($tournament));
            saveJsonLocked($filePath, $tournament, $fp);
        }

        jsonResponse(['success' => true]);
        break;

    case 'start_tournament':
        $tournamentId = trim($req['tournamentId'] ?? '');
        $clientId = trim($req['clientId'] ?? '');

        $filePath = getTournamentPath($tournamentId);
        $fp = null;
        $tournament = loadJsonLocked($filePath, $fp);

        if (!$tournament || $tournament['status'] !== 'lobby') {
            if ($fp) saveJsonLocked($filePath, $tournament, $fp);
            jsonResponse(['success' => false, 'error' => 'Torneo no disponible para iniciar'], 400);
        }

        // Rellenar huecos con Bots cómicos
        $currentCount = count($tournament['participants']);
        $neededBots = $tournament['size'] - $currentCount;
        if ($neededBots > 0) {
            $botNames = FUNNY_BOT_NAMES;
            shuffle($botNames);
            for ($i = 0; $i < $neededBots; $i++) {
                $bName = $botNames[$i % count($botNames)];
                $bId = 'bot_' . bin2hex(random_bytes(3));
                $tournament['participants'][] = [
                    'id' => $bId,
                    'clientId' => $bId,
                    'name' => $bName,
                    'isBot' => true,
                    'isHost' => false,
                    'connected' => true
                ];
            }
        }

        // Barajar participantes
        $shuffled = $tournament['participants'];
        shuffle($shuffled);

        // Construir cuadro eliminatorio
        $tournament['bracket'] = buildEmptyBracket($tournament['size']);
        $round0 = &$tournament['bracket'][0];
        for ($i = 0; $i < count($round0['matches']); $i++) {
            $round0['matches'][$i]['p1'] = $shuffled[$i * 2];
            $round0['matches'][$i]['p2'] = $shuffled[$i * 2 + 1];
            $round0['matches'][$i]['status'] = 'ready';
        }

        $tournament['status'] = 'in_progress';
        $tournament['currentRoundIndex'] = 0;

        pushEvent($tournament, 'tournament_started', sanitizeTournament($tournament));
        pushEvent($tournament, 'tournament_updated', sanitizeTournament($tournament));

        // Simular primeros cruces bot vs bot si los hubiera
        simulatePendingBotMatches($tournament);

        saveJsonLocked($filePath, $tournament, $fp);

        jsonResponse([
            'success' => true,
            'tournament' => sanitizeTournament($tournament),
            'events' => getEventsSince($tournament, (int)($req['sinceSeq'] ?? 0)),
            'lastSeq' => $tournament['eventSeq']
        ]);
        break;

    case 'enter_tournament_match':
        $tournamentId = trim($req['tournamentId'] ?? '');
        $roundIndex = (int)($req['roundIndex'] ?? 0);
        $matchIndex = (int)($req['matchIndex'] ?? 0);
        $clientId = trim($req['clientId'] ?? '');
        $playerName = trim($req['playerName'] ?? '');

        $filePath = getTournamentPath($tournamentId);
        $fp = null;
        $tournament = loadJsonLocked($filePath, $fp);

        if (!$tournament || empty($tournament['bracket'][$roundIndex]['matches'][$matchIndex])) {
            if ($fp) saveJsonLocked($filePath, $tournament, $fp);
            jsonResponse(['success' => false, 'error' => 'Partido no encontrado'], 404);
        }

        $match = &$tournament['bracket'][$roundIndex]['matches'][$matchIndex];
        $matchId = $match['id'];
        $matchRoomId = "{$tournamentId}_r{$roundIndex}_m{$matchIndex}";

        $roomPath = getRoomPath($matchRoomId);
        $rFp = null;
        $room = loadJsonLocked($roomPath, $rFp);

        if (!$room) {
            $room = createNewGameRoom($matchRoomId, (int)($tournament['penaltiesPerPlayer'] ?? 5));
            $room['tournamentContext'] = [
                'tournamentId' => $tournamentId,
                'roundIndex' => $roundIndex,
                'matchIndex' => $matchIndex,
                'matchId' => $matchId,
                'p1Data' => $match['p1'],
                'p2Data' => $match['p2']
            ];

            // Inscribir a los dos participantes en la sala
            $p1IsBot = !empty($match['p1']['isBot']);
            $p2IsBot = !empty($match['p2']['isBot']);

            $room['players'] = [
                [
                    'id' => $match['p1']['clientId'] ?? $match['p1']['id'],
                    'clientId' => $match['p1']['clientId'] ?? $match['p1']['id'],
                    'role' => 'P1',
                    'name' => $match['p1']['name'],
                    'connected' => true,
                    'isBot' => $p1IsBot
                ],
                [
                    'id' => $match['p2']['clientId'] ?? $match['p2']['id'],
                    'clientId' => $match['p2']['clientId'] ?? $match['p2']['id'],
                    'role' => 'P2',
                    'name' => $match['p2']['name'],
                    'connected' => true,
                    'isBot' => $p2IsBot
                ]
            ];

            // Si es un partido contra un bot, empezar inmediatamente
            if ($p1IsBot || $p2IsBot) {
                startNewGame($room);
            }
        }

        saveJsonLocked($roomPath, $room, $rFp);

        // Identificar rol del cliente que entra
        $myRole = 'spectator';
        if (!empty($match['p1']['clientId']) && $match['p1']['clientId'] === $clientId) {
            $myRole = 'P1';
        } elseif (!empty($match['p2']['clientId']) && $match['p2']['clientId'] === $clientId) {
            $myRole = 'P2';
        }

        $match['status'] = 'playing';
        saveJsonLocked($filePath, $tournament, $fp);

        jsonResponse([
            'success' => true,
            'roomId' => $matchRoomId,
            'role' => $myRole,
            'roomState' => sanitizeRoomForClient($room)
        ]);
        break;

    case 'poll_tournament':
    default:
        $tournamentId = trim($req['tournamentId'] ?? '');
        $sinceSeq = (int)($req['sinceSeq'] ?? 0);

        if (!$tournamentId) {
            jsonResponse(['success' => false, 'error' => 'Código de torneo no proporcionado'], 400);
        }

        $filePath = getTournamentPath($tournamentId);
        $fp = null;
        $tournament = loadJsonLocked($filePath, $fp);

        if (!$tournament) {
            jsonResponse(['success' => false, 'error' => 'Torneo no encontrado'], 404);
        }

        // Revisar si hay partidos de bots pendientes de avanzar
        simulatePendingBotMatches($tournament);

        $events = getEventsSince($tournament, $sinceSeq);
        saveJsonLocked($filePath, $tournament, $fp);

        jsonResponse([
            'success' => true,
            'tournament' => sanitizeTournament($tournament),
            'events' => $events,
            'lastSeq' => $tournament['eventSeq']
        ]);
        break;
}
