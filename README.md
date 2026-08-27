# SpotRoulette.io
A friendly game to play with friends. Guess who hears which song. 

## Run it

Open `index.html` in a browser. The included demo room is playable immediately.

## Spotify connection

The `Spotify` adapter in `app.js` contains the Web API calls for the signed-in profile and top tracks. To enable real account connections, register a Spotify app, add the page URL as a redirect URI, and set `Spotify.clientId` to the client ID. Use Authorization Code + PKCE for access tokens and never store tokens in source control. The demo room stays local until a room/auth service is added.
