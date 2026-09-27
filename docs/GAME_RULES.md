# Game rules

Every value is clamped to 0–100. The server runs the simulation before it reads or changes a pet; the elapsed interval is capped at 24 hours.

| While awake, per hour | Change |
| --- | --- |
| Satiety | -4 |
| Happiness | -2 |
| Energy | -3 |
| Hygiene | -2 |

Sleeping changes energy to **+12/hour**; satiety, happiness, and hygiene still decay. Health loses up to 4/hour when one or more fundamental needs are below 25, scaled by how many are unmet. When all four needs are at least 60, health recovers 1/hour.

| Ritual | Result | Cooldown |
| --- | --- | --- |
| Feed | +20 satiety | 5 minutes |
| Play | +15 happiness, -10 energy, -5 satiety | 5 minutes |
| Clean | +25 hygiene | 10 minutes |
| Sleep / Wake | toggle rest | none |

Feed, play, and clean are unavailable during sleep. Health below 30 is represented as sick; ORIO does not permanently die in this MVP. All balance values live in `DEFAULT_GAME_RULES` in the engine.
