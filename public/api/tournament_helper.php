<?php
/**
 * ¡PENALTAZO! - Funciones auxiliares para la gestión de Torneos en PHP
 */

require_once __DIR__ . '/common.php';

function buildEmptyBracket(int $size): array {
    $roundCount = 0;
    $roundNames = [];

    if ($size === 4) {
        $roundCount = 2;
        $roundNames = ['Semifinales', 'Gran Final'];
    } elseif ($size === 8) {
        $roundCount = 3;
        $roundNames = ['Cuartos de Final', 'Semifinales', 'Gran Final'];
    } else { // 16
        $roundCount = 4;
        $roundNames = ['Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Gran Final'];
    }

    $bracket = [];
    $matchesInRound = (int)($size / 2);

    for ($r = 0; $r < $roundCount; $r++) {
        $matches = [];
        for ($m = 0; $m < $matchesInRound; $m++) {
            $matches[] = [
                'id' => "match_r{$r}_m{$m}",
                'roundIndex' => $r,
                'matchIndex' => $m,
                'p1' => null,
                'p2' => null,
                'winner' => null,
                'score' => ['p1' => null, 'p2' => null],
                'status' => 'pending' // 'pending' | 'ready' | 'playing' | 'finished'
            ];
        }
        $bracket[] = [
            'roundIndex' => $r,
            'name' => $roundNames[$r],
            'matches' => $matches
        ];
        $matchesInRound = (int)($matchesInRound / 2);
    }

    return $bracket;
}

function sanitizeTournament(array $tournament): array {
    $participants = [];
    foreach ($tournament['participants'] ?? [] as $p) {
        $participants[] = [
            'id' => $p['id'],
            'socketId' => $p['socketId'] ?? null,
            'clientId' => $p['clientId'] ?? $p['id'],
            'name' => $p['name'],
            'isBot' => $p['isBot'] ?? false,
            'isHost' => $p['isHost'] ?? false,
            'connected' => $p['connected'] ?? true
        ];
    }

    return [
        'id' => $tournament['id'],
        'name' => $tournament['name'] ?? 'Copa Penaltazo',
        'size' => $tournament['size'] ?? 8,
        'penaltiesPerPlayer' => $tournament['penaltiesPerPlayer'] ?? 5,
        'status' => $tournament['status'] ?? 'lobby',
        'hostClientId' => $tournament['hostClientId'] ?? ($tournament['participants'][0]['clientId'] ?? ''),
        'participants' => $participants,
        'bracket' => $tournament['bracket'] ?? [],
        'currentRoundIndex' => $tournament['currentRoundIndex'] ?? 0,
        'champion' => $tournament['champion'] ?? null,
        'runnerUp' => $tournament['runnerUp'] ?? null
    ];
}

function recordTournamentMatchResultHelper(array &$tournament, int $roundIndex, int $matchIndex, array $winnerPlayer, array $score): array {
    if (!isset($tournament['bracket'][$roundIndex]['matches'][$matchIndex])) {
        return ['success' => false];
    }

    $match = &$tournament['bracket'][$roundIndex]['matches'][$matchIndex];
    $match['winner'] = $winnerPlayer;
    $match['score'] = $score;
    $match['status'] = 'finished';

    $isFinal = ($roundIndex === count($tournament['bracket']) - 1);
    if ($isFinal) {
        $tournament['status'] = 'completed';
        $tournament['champion'] = $winnerPlayer;
        $runnerUp = ($winnerPlayer['id'] === $match['p1']['id']) ? $match['p2'] : $match['p1'];
        $tournament['runnerUp'] = $runnerUp;

        pushEvent($tournament, 'tournament_match_finished', [
            'tournament' => sanitizeTournament($tournament),
            'matchId' => $match['id'],
            'winner' => $winnerPlayer,
            'scores' => $score,
            'tournamentCompleted' => true
        ]);
        pushEvent($tournament, 'tournament_updated', sanitizeTournament($tournament));
        return ['tournamentCompleted' => true, 'roundCompleted' => true];
    }

    // Avanzar ganador a la siguiente ronda
    $nextRoundIndex = $roundIndex + 1;
    $nextMatchIndex = (int)floor($matchIndex / 2);
    $nextMatch = &$tournament['bracket'][$nextRoundIndex]['matches'][$nextMatchIndex];

    if ($matchIndex % 2 === 0) {
        $nextMatch['p1'] = $winnerPlayer;
    } else {
        $nextMatch['p2'] = $winnerPlayer;
    }

    if (!empty($nextMatch['p1']) && !empty($nextMatch['p2'])) {
        $nextMatch['status'] = 'ready';
    }

    // Comprobar si todos los partidos de la ronda han terminado
    $allFinished = true;
    foreach ($tournament['bracket'][$roundIndex]['matches'] as $m) {
        if ($m['status'] !== 'finished') {
            $allFinished = false;
            break;
        }
    }

    if ($allFinished) {
        $tournament['currentRoundIndex'] = $nextRoundIndex;
        foreach ($tournament['bracket'][$nextRoundIndex]['matches'] as &$nm) {
            if (!empty($nm['p1']) && !empty($nm['p2']) && $nm['status'] === 'pending') {
                $nm['status'] = 'ready';
            }
        }
    }

    pushEvent($tournament, 'tournament_match_finished', [
        'tournament' => sanitizeTournament($tournament),
        'matchId' => $match['id'],
        'winner' => $winnerPlayer,
        'scores' => $score,
        'tournamentCompleted' => false
    ]);
    pushEvent($tournament, 'tournament_updated', sanitizeTournament($tournament));

    // Si hay partidos bot vs bot listos para simular
    simulatePendingBotMatches($tournament);

    return ['tournamentCompleted' => false, 'roundCompleted' => $allFinished];
}

/**
 * Simula partidos bot vs bot de forma realista
 */
function simulatePendingBotMatches(array &$tournament): void {
    if (($tournament['status'] ?? '') !== 'in_progress') return;

    $base = (int)($tournament['penaltiesPerPlayer'] ?? 5);

    foreach ($tournament['bracket'] as $rIdx => &$round) {
        foreach ($round['matches'] as $mIdx => &$match) {
            if ($match['status'] === 'ready' && !empty($match['p1']['isBot']) && !empty($match['p2']['isBot'])) {
                // Simulación de penaltis realista
                $s1 = 0;
                $s2 = 0;
                if ($base > 0) {
                    for ($i = 0; $i < $base; $i++) {
                        if (random_int(0, 100) < 72) $s1++;
                        $rem1AfterP1 = $base - ($i + 1);
                        $rem2AfterP1 = $base - $i;
                        if ($s1 > $s2 + $rem2AfterP1 || $s2 > $s1 + $rem1AfterP1) break;

                        if (random_int(0, 100) < 72) $s2++;
                        $rem1AfterP2 = $base - ($i + 1);
                        $rem2AfterP2 = $base - ($i + 1);
                        if ($s1 > $s2 + $rem2AfterP2 || $s2 > $s1 + $rem1AfterP2) break;
                    }
                }

                while ($s1 === $s2) {
                    if (random_int(0, 100) < 72) $s1++;
                    if (random_int(0, 100) < 72) $s2++;
                }

                $winner = $s1 > $s2 ? $match['p1'] : $match['p2'];
                recordTournamentMatchResultHelper($tournament, $rIdx, $mIdx, $winner, ['p1' => $s1, 'p2' => $s2]);
            }
        }
    }
}
