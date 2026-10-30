<?php
/**
 * ¡PENALTAZO! - API de Partidas 1v1 y Tanda de Penaltis
 */

require_once __DIR__ . '/common.php';

initDataDirs();
$req = getRequestData();
$action = $req['action'] ?? '';

switch ($action) {
    case 'create_room':
        $roomId = generateRoomId();
        $penalties = (int)($req['penaltiesPerPlayer'] ?? 5);
        $playerName = trim($req['playerName'] ?? 'Jugador 1') ?: 'Jugador 1';
        $clientId = trim($req['clientId'] ?? ('cid_' . bin2hex(random_bytes(4))));

        $room = createNewGameRoom($roomId, $penalties);
        $room['players'][] = [
            'id' => $clientId,
            'clientId' => $clientId,
            'role' => 'P1',
            'name' => $playerName,
            'connected' => true,
            'isBot' => false
        ];

        pushEvent($room, 'joined_room', [
            'roomId' => $roomId,
            'role' => 'P1',
            'roomState' => sanitizeRoomForClient($room)
        ]);

        $filePath = getRoomPath($roomId);
        saveJsonLocked($filePath, $room);

        jsonResponse([
            'success' => true,
            'roomId' => $roomId,
            'role' => 'P1',
            'clientId' => $clientId,
            'roomState' => sanitizeRoomForClient($room),
            'events' => getEventsSince($room, 0),
            'lastSeq' => $room['eventSeq']
        ]);
        break;

    case 'join_room':
        $roomId = trim($req['roomId'] ?? '');
        if (!$roomId) {
            jsonResponse(['success' => false, 'error' => 'Código de sala no proporcionado'], 400);
        }

        $filePath = getRoomPath($roomId);
        $fp = null;
        $room = loadJsonLocked($filePath, $fp);
        $penalties = (int)($req['penaltiesPerPlayer'] ?? 5);
        $playerName = trim($req['playerName'] ?? '');
        $clientId = trim($req['clientId'] ?? ('cid_' . bin2hex(random_bytes(4))));
        $sinceSeq = (int)($req['sinceSeq'] ?? 0);

        if (!$room) {
            // Si la sala no existía, crearla
            $room = createNewGameRoom($roomId, $penalties);
        }

        // Buscar jugador existente por clientId
        $existingP1 = null;
        $existingP2 = null;
        foreach ($room['players'] as &$p) {
            if ($p['role'] === 'P1') $existingP1 = &$p;
            if ($p['role'] === 'P2') $existingP2 = &$p;
        }

        $playerRole = null;
        $isReconnecting = false;
        $isReplacedPlayer = false;

        if ($existingP1 && ($existingP1['clientId'] === $clientId)) {
            $playerRole = 'P1';
            $isReconnecting = true;
            if ($playerName) $existingP1['name'] = $playerName;
            $existingP1['connected'] = true;
        } elseif ($existingP2 && ($existingP2['clientId'] === $clientId)) {
            $playerRole = 'P2';
            $isReconnecting = true;
            if ($playerName) $existingP2['name'] = $playerName;
            $existingP2['connected'] = true;
        } elseif (!$existingP1) {
            $playerRole = 'P1';
            $room['players'][] = [
                'id' => $clientId,
                'clientId' => $clientId,
                'role' => 'P1',
                'name' => $playerName ?: 'Jugador 1',
                'connected' => true,
                'isBot' => false
            ];
        } elseif (!$existingP2) {
            $playerRole = 'P2';
            $room['players'][] = [
                'id' => $clientId,
                'clientId' => $clientId,
                'role' => 'P2',
                'name' => $playerName ?: 'Jugador 2',
                'connected' => true,
                'isBot' => false
            ];
        } elseif (!($existingP1['connected'] ?? true)) {
            $playerRole = 'P1';
            $isReplacedPlayer = true;
            $existingP1['clientId'] = $clientId;
            $existingP1['name'] = $playerName ?: 'Jugador 1';
            $existingP1['connected'] = true;
        } elseif (!($existingP2['connected'] ?? true)) {
            $playerRole = 'P2';
            $isReplacedPlayer = true;
            $existingP2['clientId'] = $clientId;
            $existingP2['name'] = $playerName ?: 'Jugador 2';
            $existingP2['connected'] = true;
        } else {
            // Modo Rey de la Pista (cola de retadores / espectador)
            $playerRole = 'spectator';
            $challengerName = $playerName ?: ('Retador ' . (count($room['challengerQueue']) + 1));
            $found = false;
            foreach ($room['challengerQueue'] as &$ch) {
                if ($ch['clientId'] === $clientId) {
                    $ch['name'] = $challengerName;
                    $ch['connected'] = true;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $room['challengerQueue'][] = [
                    'id' => $clientId,
                    'clientId' => $clientId,
                    'name' => $challengerName,
                    'connected' => true
                ];
            }
        }

        // Si ambos jugadores están listos y la sala estaba esperando, arrancar partido
        $hasP1 = false;
        $hasP2 = false;
        foreach ($room['players'] as $pl) {
            if ($pl['role'] === 'P1') $hasP1 = true;
            if ($pl['role'] === 'P2') $hasP2 = true;
        }

        if ($hasP1 && $hasP2) {
            if ($room['state'] === 'waiting' || $isReplacedPlayer) {
                startNewGame($room);
            }
        }

        pushEvent($room, 'room_update', sanitizeRoomForClient($room));

        saveJsonLocked($filePath, $room, $fp);

        jsonResponse([
            'success' => true,
            'roomId' => $roomId,
            'role' => $playerRole,
            'clientId' => $clientId,
            'roomState' => sanitizeRoomForClient($room),
            'events' => getEventsSince($room, $sinceSeq),
            'lastSeq' => $room['eventSeq']
        ]);
        break;

    case 'submit_choice':
        $roomId = trim($req['roomId'] ?? '');
        $clientId = trim($req['clientId'] ?? '');
        $row = (int)($req['row'] ?? 0);
        $col = (int)($req['col'] ?? 0);

        $filePath = getRoomPath($roomId);
        $fp = null;
        $room = loadJsonLocked($filePath, $fp);

        if (!$room) {
            jsonResponse(['success' => false, 'error' => 'Sala no encontrada'], 404);
        }

        // Identificar rol del jugador
        $myRole = null;
        foreach ($room['players'] as $p) {
            if ($p['clientId'] === $clientId) {
                $myRole = $p['role'];
                break;
            }
        }

        if (!$myRole || !in_array($myRole, ['P1', 'P2'], true)) {
            saveJsonLocked($filePath, $room, $fp);
            jsonResponse(['success' => false, 'error' => 'No tienes permiso para jugar en esta sala'], 403);
        }

        if ($room['state'] !== 'playing') {
            saveJsonLocked($filePath, $room, $fp);
            jsonResponse(['success' => false, 'error' => 'La tanda no está en juego activo'], 400);
        }

        $room['choices'][$myRole] = ['row' => $row, 'col' => $col];
        pushEvent($room, 'choice_confirmed', ['role' => $myRole]);

        // Si el oponente es un Bot (ej. en partido de torneo o práctica), generar su tiro/parada inmediatamente
        $roles = getTurnRoles($room['turnIndex']);
        $opponentRole = ($myRole === 'P1') ? 'P2' : 'P1';
        $opponentPlayer = null;
        foreach ($room['players'] as $p) {
            if ($p['role'] === $opponentRole) {
                $opponentPlayer = $p;
                break;
            }
        }

        if ($opponentPlayer && !empty($opponentPlayer['isBot']) && empty($room['choices'][$opponentRole])) {
            $oppType = ($roles['shooterRole'] === $opponentRole) ? 'shooter' : 'keeper';
            $room['choices'][$opponentRole] = getBotChoice($oppType);
            pushEvent($room, 'choice_confirmed', ['role' => $opponentRole]);
        }

        // Si ambos han elegido, resolver el turno
        if (!empty($room['choices']['P1']) && !empty($room['choices']['P2'])) {
            resolveTurn($room);
        }

        saveJsonLocked($filePath, $room, $fp);

        jsonResponse([
            'success' => true,
            'roomState' => sanitizeRoomForClient($room),
            'events' => getEventsSince($room, (int)($req['sinceSeq'] ?? 0)),
            'lastSeq' => $room['eventSeq']
        ]);
        break;

    case 'request_rematch':
        $roomId = trim($req['roomId'] ?? '');
        $clientId = trim($req['clientId'] ?? '');

        $filePath = getRoomPath($roomId);
        $fp = null;
        $room = loadJsonLocked($filePath, $fp);

        if (!$room) {
            jsonResponse(['success' => false, 'error' => 'Sala no encontrada'], 404);
        }

        $myRole = null;
        foreach ($room['players'] as $p) {
            if ($p['clientId'] === $clientId) {
                $myRole = $p['role'];
                break;
            }
        }

        if ($myRole && in_array($myRole, ['P1', 'P2'], true)) {
            if (!in_array($myRole, $room['rematchVotes'], true)) {
                $room['rematchVotes'][] = $myRole;
            }
            pushEvent($room, 'rematch_status', ['votes' => $room['rematchVotes']]);

            // Si el oponente es bot, vota automáticamente a favor de la revancha
            $oppRole = ($myRole === 'P1') ? 'P2' : 'P1';
            foreach ($room['players'] as $p) {
                if ($p['role'] === $oppRole && !empty($p['isBot'])) {
                    if (!in_array($oppRole, $room['rematchVotes'], true)) {
                        $room['rematchVotes'][] = $oppRole;
                    }
                }
            }

            if (in_array('P1', $room['rematchVotes'], true) && in_array('P2', $room['rematchVotes'], true)) {
                startNewGame($room);
            }
        }

        saveJsonLocked($filePath, $room, $fp);

        jsonResponse([
            'success' => true,
            'roomState' => sanitizeRoomForClient($room),
            'events' => getEventsSince($room, (int)($req['sinceSeq'] ?? 0)),
            'lastSeq' => $room['eventSeq']
        ]);
        break;

    case 'send_emote':
        $roomId = trim($req['roomId'] ?? '');
        $clientId = trim($req['clientId'] ?? '');
        $emoji = trim($req['emoji'] ?? '⚽');
        $text = trim($req['text'] ?? '');

        $filePath = getRoomPath($roomId);
        $fp = null;
        $room = loadJsonLocked($filePath, $fp);

        if ($room) {
            $senderRole = 'P1';
            foreach ($room['players'] as $p) {
                if ($p['clientId'] === $clientId) {
                    $senderRole = $p['role'];
                    break;
                }
            }
            pushEvent($room, 'emote_received', [
                'role' => $senderRole,
                'emoji' => $emoji,
                'text' => $text
            ]);
            saveJsonLocked($filePath, $room, $fp);
        }

        jsonResponse(['success' => true]);
        break;

    case 'poll':
    default:
        $roomId = trim($req['roomId'] ?? '');
        $sinceSeq = (int)($req['sinceSeq'] ?? 0);

        if (!$roomId) {
            jsonResponse(['success' => false, 'error' => 'Código de sala no proporcionado'], 400);
        }

        $filePath = getRoomPath($roomId);
        $fp = null;
        $room = loadJsonLocked($filePath, $fp);

        if (!$room) {
            jsonResponse(['success' => false, 'error' => 'Sala no encontrada'], 404);
        }

        // Revisar transiciones temporales automáticas
        checkResolvingState($room);
        checkTurnDeadline($room);

        $events = getEventsSince($room, $sinceSeq);

        saveJsonLocked($filePath, $room, $fp);

        jsonResponse([
            'success' => true,
            'roomState' => sanitizeRoomForClient($room),
            'state' => $room['state'],
            'turnIndex' => $room['turnIndex'],
            'events' => $events,
            'lastSeq' => $room['eventSeq']
        ]);
        break;
}
