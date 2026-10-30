<?php
/**
 * ¡PENALTAZO! - Módulo común para el backend PHP 8.4
 * Compatible con hosting compartido (Piensa Solutions, Apache, cPanel).
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

// Cabeceras HTTP para API REST y CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Rutas de datos persistentes protegidos
define('DATA_DIR', __DIR__ . '/../data');
define('ROOMS_DIR', DATA_DIR . '/rooms');
define('TOURNAMENTS_DIR', DATA_DIR . '/tournaments');
define('TURN_TIME_LIMIT_SEC', 12);

const FUNNY_BOT_NAMES = [
    'Cristiano Rolando 🇵🇹', 'Leo Missi 🇦🇷', 'Kylian Empapé 🇫🇷',
    'Erling Jamón 🇳🇴', 'Dibu Martillo 🧤', 'Iker Casi-llas 🧤',
    'Luka Modricito 🇭🇷', 'Zidán con Pelazo 🇫🇷', 'Vini con Queso 🇧🇷',
    'Lewandogski 🇵🇱', 'Cholo Furioso 🇦🇷', 'Karim Benzemago 🇫🇷',
    'Pedri Pan 🇪🇸', 'Gaviota Gavi 🇪🇸', 'Cortois de Palo 🧤',
    'Neymar Rodando 🇧🇷', 'Puyol de Piedra 🇪🇸', 'Ronalgordito 🇧🇷',
    'Bekam Gomina 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Iniesta Pelón 🇪🇸', 'Ramos Roja 🟥',
    'Griezmann Chef 🇫🇷', 'Suárez Bocado 🇺🇾', 'Ter Stegen Muro 🧤',
    'Fede Halcón 🇺🇾', 'Kroos Cartabón 🇩🇪', 'Lamine Tamal 🇪🇸',
    'Bellingjamón 🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Julián Arañita 🕷️', 'Drogba-uette 🇨🇮'
];

/**
 * Inicializa los directorios de almacenamiento y protege la carpeta de accesos directos
 */
function initDataDirs(): void {
    if (!is_dir(DATA_DIR)) {
        @mkdir(DATA_DIR, 0755, true);
    }
    $htaccess = DATA_DIR . '/.htaccess';
    if (!file_exists($htaccess)) {
        @file_put_contents($htaccess, "<IfModule authz_core_module>\n    Require all denied\n</IfModule>\n<IfModule !authz_core_module>\n    Deny from all\n</IfModule>\n");
    }
    if (!is_dir(ROOMS_DIR)) {
        @mkdir(ROOMS_DIR, 0755, true);
    }
    if (!is_dir(TOURNAMENTS_DIR)) {
        @mkdir(TOURNAMENTS_DIR, 0755, true);
    }
}

/**
 * Obtiene los parámetros enviados en GET, POST o cuerpo JSON
 */
function getRequestData(): array {
    $input = file_get_contents('php://input');
    $json = json_decode($input, true);
    if (!is_array($json)) {
        $json = [];
    }
    return array_merge($_GET, $_POST, $json);
}

/**
 * Envía una respuesta JSON estructurada y finaliza
 */
function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Genera código único de sala (formato ABC-123)
 */
function generateRoomId(): string {
    $letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    $numbers = '23456789';
    $code = '';
    for ($i = 0; $i < 3; $i++) {
        $code .= $letters[random_int(0, strlen($letters) - 1)];
    }
    $code .= '-';
    for ($i = 0; $i < 3; $i++) {
        $code .= $numbers[random_int(0, strlen($numbers) - 1)];
    }
    return $code;
}

/**
 * Genera código único de torneo (formato COPA-ABC-123)
 */
function generateTournamentId(): string {
    return 'COPA-' . generateRoomId();
}

function getRoomPath(string $roomId): string {
    $clean = preg_replace('/[^A-Za-z0-9_\-]/', '', $roomId);
    return ROOMS_DIR . '/' . $clean . '.json';
}

function getTournamentPath(string $tournamentId): string {
    $clean = preg_replace('/[^A-Za-z0-9_\-]/', '', $tournamentId);
    return TOURNAMENTS_DIR . '/' . $clean . '.json';
}

/**
 * Carga un archivo JSON bloqueándolo para lectura/escritura atómica
 */
function loadJsonLocked(string $filePath, &$fp = null): ?array {
    if (!file_exists($filePath)) {
        return null;
    }
    $fp = @fopen($filePath, 'c+');
    if (!$fp) return null;

    flock($fp, LOCK_EX);
    $size = filesize($filePath);
    if ($size === 0) {
        return null;
    }
    rewind($fp);
    $content = fread($fp, $size);
    $data = json_decode($content, true);
    return is_array($data) ? $data : null;
}

/**
 * Guarda los datos JSON y libera el bloqueo de archivo
 */
function saveJsonLocked(string $filePath, array $data, $fp = null): void {
    $shouldClose = false;
    if (!$fp) {
        $fp = @fopen($filePath, 'c+');
        if (!$fp) return;
        flock($fp, LOCK_EX);
        $shouldClose = true;
    }

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    fflush($fp);
    flock($fp, LOCK_UN);

    if ($shouldClose) {
        fclose($fp);
    }
}

/**
 * Añade un evento secuencial al búfer de la sala o torneo
 */
function pushEvent(array &$target, string $eventName, array $data): void {
    if (!isset($target['events'])) {
        $target['events'] = [];
    }
    if (!isset($target['eventSeq'])) {
        $target['eventSeq'] = 0;
    }
    $target['eventSeq']++;
    $target['events'][] = [
        'seq' => $target['eventSeq'],
        'event' => $eventName,
        'data' => $data,
        'time' => microtime(true)
    ];

    // Mantener sólo los últimos 50 eventos para optimizar tamaño en disco
    if (count($target['events']) > 50) {
        $target['events'] = array_slice($target['events'], -50);
    }
}

/**
 * Obtiene los nuevos eventos ocurridos desde el número de secuencia indicado
 */
function getEventsSince(array $target, int $sinceSeq): array {
    if (empty($target['events'])) return [];
    $newEvents = [];
    foreach ($target['events'] as $ev) {
        if ($ev['seq'] > $sinceSeq) {
            $newEvents[] = $ev;
        }
    }
    return $newEvents;
}

/**
 * Determina los roles de lanzador y portero según el índice del turno
 */
function getTurnRoles(int $turnIndex): array {
    $isP1Shooter = ($turnIndex % 2 === 0);
    return [
        'shooterRole' => $isP1Shooter ? 'P1' : 'P2',
        'keeperRole' => $isP1Shooter ? 'P2' : 'P1'
    ];
}

/**
 * Selección probabilística de tiros y estiradas para bots
 */
function getBotChoice(string $role): array {
    $rand = random_int(0, 1000) / 1000;
    if ($role === 'shooter') {
        if ($rand < 0.35) return random_int(0, 1) === 0 ? ['row' => 0, 'col' => 0] : ['row' => 0, 'col' => 2];
        if ($rand < 0.70) return random_int(0, 1) === 0 ? ['row' => 1, 'col' => 0] : ['row' => 1, 'col' => 2];
        if ($rand < 0.85) return ['row' => 1, 'col' => 1];
        return ['row' => 0, 'col' => 1];
    } else {
        $all = [
            ['row' => 0, 'col' => 0], ['row' => 0, 'col' => 1], ['row' => 0, 'col' => 2],
            ['row' => 1, 'col' => 0], ['row' => 1, 'col' => 1], ['row' => 1, 'col' => 2]
        ];
        return $all[array_rand($all)];
    }
}

/**
 * Formatea el estado de la sala para enviarlo al cliente
 */
function sanitizeRoomForClient(array $room): array {
    $players = [];
    foreach ($room['players'] ?? [] as $p) {
        $players[] = [
            'role' => $p['role'],
            'name' => $p['name'],
            'connected' => $p['connected'] ?? true,
            'isBot' => $p['isBot'] ?? false
        ];
    }

    $queue = [];
    foreach ($room['challengerQueue'] ?? [] as $c) {
        if (($c['connected'] ?? true) !== false) {
            $queue[] = [
                'name' => $c['name'],
                'clientId' => $c['clientId'] ?? ''
            ];
        }
    }

    return [
        'id' => $room['id'],
        'players' => $players,
        'challengerQueue' => $queue,
        'seriesWins' => $room['seriesWins'] ?? ['P1' => 0, 'P2' => 0],
        'h2hWins' => $room['h2hWins'] ?? [],
        'kingRole' => $room['kingRole'] ?? null,
        'kingStreak' => $room['kingStreak'] ?? 0,
        'lastWinnerRole' => $room['lastWinnerRole'] ?? null,
        'state' => $room['state'] ?? 'waiting',
        'penaltiesPerPlayer' => $room['penaltiesPerPlayer'] ?? 5,
        'turnIndex' => $room['turnIndex'] ?? 0,
        'isSuddenDeath' => $room['isSuddenDeath'] ?? false,
        'suddenDeathRound' => $room['suddenDeathRound'] ?? 0,
        'scores' => $room['scores'] ?? ['P1' => 0, 'P2' => 0],
        'history' => $room['history'] ?? ['P1' => [], 'P2' => []],
        'hasChoices' => [
            'P1' => !empty($room['choices']['P1']),
            'P2' => !empty($room['choices']['P2'])
        ],
        'turnTimeLimit' => TURN_TIME_LIMIT_SEC,
        'turnDeadline' => $room['turnDeadline'] ?? null
    ];
}

/**
 * Crea la estructura inicial de una nueva sala
 */
function createNewGameRoom(string $roomId, int $penaltiesPerPlayer = 5): array {
    $basePenalties = in_array($penaltiesPerPlayer, [0, 3, 5], true) ? $penaltiesPerPlayer : 5;
    return [
        'id' => $roomId,
        'players' => [],
        'challengerQueue' => [],
        'state' => 'waiting',
        'penaltiesPerPlayer' => $basePenalties,
        'turnIndex' => 0,
        'isSuddenDeath' => ($basePenalties === 0),
        'suddenDeathRound' => ($basePenalties === 0) ? 1 : 0,
        'scores' => ['P1' => 0, 'P2' => 0],
        'seriesWins' => ['P1' => 0, 'P2' => 0],
        'h2hWins' => [],
        'kingRole' => null,
        'kingStreak' => 0,
        'lastWinnerRole' => null,
        'turnDeadline' => null,
        'resolveStartTime' => null,
        'pendingGameOver' => false,
        'pendingWinner' => null,
        'history' => ['P1' => [], 'P2' => []],
        'choices' => ['P1' => null, 'P2' => null],
        'rematchVotes' => [],
        'tournamentContext' => null,
        'events' => [],
        'eventSeq' => 0
    ];
}

/**
 * Inicia una tanda de penaltis
 */
function startNewGame(array &$room): void {
    $room['state'] = 'playing';
    $room['turnIndex'] = 0;
    $room['isSuddenDeath'] = ($room['penaltiesPerPlayer'] === 0);
    $room['suddenDeathRound'] = ($room['penaltiesPerPlayer'] === 0) ? 1 : 0;
    $room['scores'] = ['P1' => 0, 'P2' => 0];
    $room['history'] = ['P1' => [], 'P2' => []];
    $room['choices'] = ['P1' => null, 'P2' => null];
    $room['rematchVotes'] = [];
    $room['turnDeadline'] = time() + TURN_TIME_LIMIT_SEC;
    $room['resolveStartTime'] = null;
    $room['pendingGameOver'] = false;
    $room['pendingWinner'] = null;

    $roles = getTurnRoles($room['turnIndex']);

    pushEvent($room, 'game_started', [
        'turnIndex' => $room['turnIndex'],
        'shooterRole' => $roles['shooterRole'],
        'keeperRole' => $roles['keeperRole'],
        'isSuddenDeath' => $room['isSuddenDeath'],
        'suddenDeathRound' => $room['suddenDeathRound'],
        'penaltiesPerPlayer' => $room['penaltiesPerPlayer'],
        'turnTimeLimit' => TURN_TIME_LIMIT_SEC,
        'roomState' => sanitizeRoomForClient($room)
    ]);
}

/**
 * Resuelve el disparo y estirada del turno actual
 */
function resolveTurn(array &$room): void {
    $roles = getTurnRoles($room['turnIndex']);
    $shooterRole = $roles['shooterRole'];
    $keeperRole = $roles['keeperRole'];

    $shooterChoice = $room['choices'][$shooterRole];
    $keeperChoice = $room['choices'][$keeperRole];

    $sRow = (int)($shooterChoice['row'] ?? 0);
    $sCol = (int)($shooterChoice['col'] ?? 0);
    $kRow = (int)($keeperChoice['row'] ?? 0);
    $kCol = (int)($keeperChoice['col'] ?? 0);

    $isLowCenter = ($sRow === 1 && $sCol === 1);
    $missRoll = !$isLowCenter ? (random_int(0, 1000) / 1000) : 1.0;
    $isPost = $missRoll < 0.07;
    $isOut = !$isPost && ($missRoll < 0.14);

    $isSameCell = ($sRow === $kRow && $sCol === $kCol);
    $isGoal = !$isOut && !$isPost && !$isSameCell;

    if ($isGoal) {
        $room['scores'][$shooterRole]++;
    }

    $attemptNumber = count($room['history'][$shooterRole]) + 1;
    $turnRecord = [
        'turnIndex' => $room['turnIndex'],
        'attempt' => $attemptNumber,
        'isGoal' => $isGoal,
        'isOut' => $isOut || $isPost,
        'isPost' => $isPost,
        'shooterChoice' => $shooterChoice,
        'keeperChoice' => $keeperChoice,
        'isSuddenDeath' => $room['isSuddenDeath']
    ];
    $room['history'][$shooterRole][] = $turnRecord;

    $nextTurnIndex = $room['turnIndex'] + 1;
    $gameOver = false;
    $winner = null;
    $nextIsSuddenDeath = $room['isSuddenDeath'];
    $nextSuddenDeathRound = $room['suddenDeathRound'];
    $basePenalties = $room['penaltiesPerPlayer'] ?? 0;
    $totalRegularTurns = $basePenalties * 2;
    $isMathematicalVictory = false;

    if (!$room['isSuddenDeath']) {
        $rem1 = max(0, $basePenalties - count($room['history']['P1']));
        $rem2 = max(0, $basePenalties - count($room['history']['P2']));

        if ($room['scores']['P1'] > $room['scores']['P2'] + $rem2) {
            $gameOver = true;
            $winner = 'P1';
            $isMathematicalVictory = ($nextTurnIndex < $totalRegularTurns);
        } elseif ($room['scores']['P2'] > $room['scores']['P1'] + $rem1) {
            $gameOver = true;
            $winner = 'P2';
            $isMathematicalVictory = ($nextTurnIndex < $totalRegularTurns);
        } elseif ($nextTurnIndex >= $totalRegularTurns) {
            if ($room['scores']['P1'] > $room['scores']['P2']) {
                $gameOver = true;
                $winner = 'P1';
            } elseif ($room['scores']['P2'] > $room['scores']['P1']) {
                $gameOver = true;
                $winner = 'P2';
            } else {
                $nextIsSuddenDeath = true;
                $nextSuddenDeathRound = 1;
            }
        }
    } else {
        if ($nextTurnIndex % 2 === 0) {
            if ($room['scores']['P1'] > $room['scores']['P2']) {
                $gameOver = true;
                $winner = 'P1';
            } elseif ($room['scores']['P2'] > $room['scores']['P1']) {
                $gameOver = true;
                $winner = 'P2';
            } else {
                $nextSuddenDeathRound += 1;
            }
        }
    }

    if ($gameOver && $winner) {
        $room['lastWinnerRole'] = $winner;
        if (!isset($room['seriesWins'])) $room['seriesWins'] = ['P1' => 0, 'P2' => 0];
        $room['seriesWins'][$winner] = ($room['seriesWins'][$winner] ?? 0) + 1;

        $winnerPlayer = null;
        foreach ($room['players'] as $p) {
            if ($p['role'] === $winner) {
                $winnerPlayer = $p;
                break;
            }
        }
        if ($winnerPlayer && !empty($winnerPlayer['name'])) {
            $name = $winnerPlayer['name'];
            if (!isset($room['h2hWins'])) $room['h2hWins'] = [];
            $room['h2hWins'][$name] = ($room['h2hWins'][$name] ?? 0) + 1;
        }

        if (($room['kingRole'] ?? null) === $winner) {
            $room['kingStreak'] = ($room['kingStreak'] ?? 1) + 1;
        } else {
            $room['kingRole'] = $winner;
            $room['kingStreak'] = 1;
        }
    }

    $enteringSuddenDeath = !$room['isSuddenDeath'] && $nextIsSuddenDeath;

    $resolvedPayload = [
        'turnIndex' => $room['turnIndex'],
        'shooterRole' => $shooterRole,
        'keeperRole' => $keeperRole,
        'shooterChoice' => $shooterChoice,
        'keeperChoice' => $keeperChoice,
        'isGoal' => $isGoal,
        'isOut' => $isOut || $isPost,
        'isPost' => $isPost,
        'isSuddenDeath' => $room['isSuddenDeath'],
        'suddenDeathRound' => $room['suddenDeathRound'],
        'scores' => $room['scores'],
        'history' => $room['history'],
        'gameOver' => $gameOver,
        'winner' => $winner,
        'isMathematicalVictory' => $isMathematicalVictory,
        'enteringSuddenDeath' => $enteringSuddenDeath,
        'penaltiesPerPlayer' => $room['penaltiesPerPlayer'],
        'roomState' => sanitizeRoomForClient($room)
    ];

    pushEvent($room, 'turn_resolved', $resolvedPayload);

    $room['state'] = 'resolving';
    $room['resolveStartTime'] = microtime(true);
    $room['pendingGameOver'] = $gameOver;
    $room['pendingWinner'] = $winner;
    $room['nextTurnIndex'] = $nextTurnIndex;
    $room['nextIsSuddenDeath'] = $nextIsSuddenDeath;
    $room['nextSuddenDeathRound'] = $nextSuddenDeathRound;

    // Si este partido está vinculado a un torneo y ha finalizado
    if ($gameOver && !empty($room['tournamentContext'])) {
        recordTournamentMatchOutcome($room, $winner);
    }
}

/**
 * Gestiona el paso de tiempo en 'resolving' para enviar 'next_turn_ready' tras ~2.2 segundos
 */
function checkResolvingState(array &$room): void {
    if (($room['state'] ?? '') !== 'resolving') return;

    $elapsed = microtime(true) - ($room['resolveStartTime'] ?? 0);
    if ($elapsed >= 2.2) {
        if ($room['pendingGameOver']) {
            $room['state'] = 'game_over';
            $room['choices'] = ['P1' => null, 'P2' => null];
        } else {
            $room['state'] = 'playing';
            $room['turnIndex'] = $room['nextTurnIndex'];
            $room['isSuddenDeath'] = $room['nextIsSuddenDeath'];
            $room['suddenDeathRound'] = $room['nextSuddenDeathRound'];
            $room['choices'] = ['P1' => null, 'P2' => null];
            $room['turnDeadline'] = time() + TURN_TIME_LIMIT_SEC;

            $nextRoles = getTurnRoles($room['turnIndex']);
            pushEvent($room, 'next_turn_ready', [
                'turnIndex' => $room['turnIndex'],
                'shooterRole' => $nextRoles['shooterRole'],
                'keeperRole' => $nextRoles['keeperRole'],
                'isSuddenDeath' => $room['isSuddenDeath'],
                'suddenDeathRound' => $room['suddenDeathRound'],
                'penaltiesPerPlayer' => $room['penaltiesPerPlayer'],
                'turnTimeLimit' => TURN_TIME_LIMIT_SEC,
                'roomState' => sanitizeRoomForClient($room)
            ]);
        }
    }
}

/**
 * Controla si se ha agotado el límite de 12 segundos para elegir tiro o parada
 */
function checkTurnDeadline(array &$room): void {
    if (($room['state'] ?? '') !== 'playing') return;
    if (empty($room['turnDeadline'])) return;

    if (time() >= $room['turnDeadline']) {
        $roles = getTurnRoles($room['turnIndex']);
        $shooterRole = $roles['shooterRole'];
        $keeperRole = $roles['keeperRole'];
        $timedOut = [];

        if (empty($room['choices']['P1'])) {
            $p1Type = ($shooterRole === 'P1') ? 'shooter' : 'keeper';
            $room['choices']['P1'] = getBotChoice($p1Type);
            $timedOut[] = 'P1';
            pushEvent($room, 'choice_confirmed', ['role' => 'P1', 'autoTimeout' => true]);
        }
        if (empty($room['choices']['P2'])) {
            $p2Type = ($shooterRole === 'P2') ? 'shooter' : 'keeper';
            $room['choices']['P2'] = getBotChoice($p2Type);
            $timedOut[] = 'P2';
            pushEvent($room, 'choice_confirmed', ['role' => 'P2', 'autoTimeout' => true]);
        }

        if (!empty($timedOut)) {
            pushEvent($room, 'turn_timeout_auto', ['timedOutRoles' => $timedOut]);
        }

        if (!empty($room['choices']['P1']) && !empty($room['choices']['P2'])) {
            resolveTurn($room);
        }
    }
}

/**
 * Actualiza el cuadro del torneo cuando termina un partido disputado en sala
 */
function recordTournamentMatchOutcome(array $room, string $winnerRole): void {
    $ctx = $room['tournamentContext'];
    if (empty($ctx['tournamentId'])) return;

    $tPath = getTournamentPath($ctx['tournamentId']);
    $tFp = null;
    $tournament = loadJsonLocked($tPath, $tFp);
    if (!$tournament) return;

    $roundIndex = (int)($ctx['roundIndex'] ?? 0);
    $matchIndex = (int)($ctx['matchIndex'] ?? 0);
    $winnerParticipant = ($winnerRole === 'P1') ? $ctx['p1Data'] : $ctx['p2Data'];
    $matchScore = ['p1' => $room['scores']['P1'], 'p2' => $room['scores']['P2']];

    require_once __DIR__ . '/tournament_helper.php';
    recordTournamentMatchResultHelper($tournament, $roundIndex, $matchIndex, $winnerParticipant, $matchScore);
    saveJsonLocked($tPath, $tournament, $tFp);
}
