# Standup Jokes

One clean joke for the daily standup. Pick a category, press **Space**, read it out loud.

**Live:** https://altinmurseli-hc.github.io/standup-jokes/

- Categories: Random, Dad, Pun, Knock-knock, Misc, Spooky, Christmas, Favourites, NSFW
- Two-part jokes hide the punchline until you press again
- **← / →** step back and forward through the jokes you already had
- **☆ Save** keeps a joke in Favourites (stored in your browser)
- **📅 Joke of the day** is the same joke for everyone on the same date
- **🤔 I don't get it** opens Claude in a new tab, asking it to explain the joke
- **F** (or ⛶ Big screen) shows only the joke, large, for screen sharing
- Seen jokes are remembered across reloads, so you get new ones first; never the same joke twice in a row
- Knock-knock uses a built-in list of 84 jokes
- Every category except NSFW is safe-mode only; NSFW jokes never show up anywhere else (Random, back/forward and Favourites included)
- NSFW is never remembered on reload, so the page always opens on a clean category
- Falls back to a few built-in jokes if the APIs are down

| Key | Does |
| --- | --- |
| Space | Reveal the punchline, then the next joke |
| ← → | Earlier / later jokes |
| F | Big screen on/off (Esc also exits) |

Plain HTML/CSS/JS, no build step. Jokes come from
[JokeAPI](https://jokeapi.dev), [icanhazdadjoke](https://icanhazdadjoke.com) and
[Official Joke API](https://github.com/15Dkatz/official_joke_api).

Run locally: open `index.html`, or `python3 -m http.server` in this folder.
