# Standup Jokes

One clean joke for the daily standup. Pick a category, press **Space**, read it out loud.

**Live:** https://altinmurseli-hc.github.io/standup-jokes/

- Categories: Random, Dad, Pun, Knock-knock, Misc, Spooky, Christmas, Albanian (Albania + Kosovo), Favourites, NSFW, Albanian NSFW
- Two-part jokes hide the punchline until you press again
- **← / →** step back and forward through the jokes you already had
- **☆ Save** keeps a joke in Favourites (stored in your browser)
- **F** (or ⛶ Big screen) shows only the joke, large, for screen sharing
- Seen jokes are remembered across reloads, so you get new ones first; never the same joke twice in a row
- Every category except NSFW only uses jokes that were read and checked by hand for a work meeting: 872 in `clean-jokes.js` plus 84 knock-knock jokes in `jokes.js`. They ship with the page, so nothing unchecked can come in from an API
- Albanian and Albanian NSFW mix Albanian and Kosovar (Gheg) jokes from `albanian-jokes.js`: popular jokes from Albanian joke sites and forums, retold, plus ones written for this app (no joke API has Albanian)
- NSFW is the only live category (JokeAPI). jokes from the three NSFW categories never show up anywhere else (Random, back/forward and Favourites included)
- NSFW is never remembered on reload, so the page always opens on a clean category

| Key | Does |
| --- | --- |
| Space | Reveal the punchline, then the next joke |
| ← → | Earlier / later jokes |
| F | Big screen on/off (Esc also exits) |

Plain HTML/CSS/JS, no build step. To drop a clean joke for everyone, delete its line in `clean-jokes.js`. Jokes come from
[JokeAPI](https://jokeapi.dev), [icanhazdadjoke](https://icanhazdadjoke.com) and
[Official Joke API](https://github.com/15Dkatz/official_joke_api).

Run locally: open `index.html`, or `python3 -m http.server` in this folder.
