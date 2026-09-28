# Game rules

Every value is clamped to 0–100. The server runs the simulation before it reads or changes a pet; the elapsed interval is capped at 24 hours.

| While awake, per hour | Change |
| --- | --- |
| Satiety | -4 |
| Happiness | -2 |
| Energy | -3 |
| Hygiene | -2 |

Sleeping changes energy to **+12/hour**; satiety, happiness, and hygiene still decay. Health loses up to 4/hour when one or more fundamental needs are below 25, scaled by how many are unmet. When all four needs are at least 60, health recovers 1/hour.

| Ritual | Game and result | Cooldown |
| --- | --- | --- |
| Feed | **Snack Catch**: 30 seconds; score 0â€“100; up to +20 satiety | 5 minutes |
| Play | **Memory Lights**: five sequence levels; score 0â€“100; up to +15 happiness and -10 energy | 5 minutes |
| Clean | **Bubble Bath**: 30 seconds or early finish at 100% clean; up to +25 hygiene | 10 minutes |
| Sleep / Wake | toggle rest | none |

Each care game starts a short-lived, server-owned session. Rewards are `round(score / 100 * maximum reward)`, then the stat is capped at 100. Feed and Clean collect interaction events in the browser; the API applies event-rate and duration plausibility limits. Memory Lights uses a server-generated sequence and verifies every completed prefix. Only a successfully completed game starts its cooldown. Feed, play, and clean are unavailable during sleep; Play additionally requires 15 energy before the game and costs 10 energy after a confirmed result. Health below 30 is represented as sick; ORIO does not permanently die in this MVP. All balance values live in `DEFAULT_GAME_RULES` in the engine.
