# Standup Jokes

One clean joke for the daily standup. Pick a category, press **Space**, read it out loud.

**Live:** https://altinmurseli-hc.github.io/standup-jokes/

- Categories: Random, Dad, Pun, Knock-knock, Misc, Spooky, Christmas, NSFW
- Two-part jokes hide the punchline until you press again
- Every category except NSFW is safe-mode only; NSFW jokes never show up anywhere else (Random included)
- NSFW is never remembered on reload, so the page always opens on a clean category
- Falls back to a few built-in jokes if the APIs are down

Plain HTML/CSS/JS, no build step. Jokes come from
[JokeAPI](https://jokeapi.dev), [icanhazdadjoke](https://icanhazdadjoke.com) and
[Official Joke API](https://github.com/15Dkatz/official_joke_api).

Run locally: open `index.html`, or `python3 -m http.server` in this folder.
