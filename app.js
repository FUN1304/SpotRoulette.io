const demoPlayers = [
  { name: "Maya", handle: "@mayarose", color: "#d27b62", initials: "MR" },
  { name: "Theo", handle: "@theo.wav", color: "#629b83", initials: "TW" },
  { name: "Jules", handle: "@jules.mp3", color: "#8b7baf", initials: "JM" },
  { name: "Niko", handle: "@nikonight", color: "#d0a547", initials: "NN" },
];
const demoTracks = [
  { title: "Electric Feel", artist: "MGMT", owner: "Maya", preview_url: null },
  { title: "Sweet Disposition", artist: "The Temper Trap", owner: "Theo", preview_url: null },
  { title: "Lisztomania", artist: "Phoenix", owner: "Jules", preview_url: null },
  { title: "Midnight City", artist: "M83", owner: "Niko", preview_url: null },
];
const state = { players: [...demoPlayers], tracks: [...demoTracks], round: 0, track: null, locked: false, audio: null };
const $ = (id) => document.getElementById(id);

function renderPlayers() {
  $("playerCount").textContent = state.players.length;
  $("playersGrid").innerHTML = state.players.map((player) => `<article class="player-card"><span class="avatar" style="background:${player.color}">${player.initials}</span><div><h3>${player.name}</h3><p>${player.handle}</p></div><span class="spotify-check">●</span></article>`).join("");
}

function renderGuesses() {
  $("guessGrid").innerHTML = state.players.map((player) => `<button class="guess-button" data-player="${player.name}"><span class="avatar" style="background:${player.color}">${player.initials}</span>${player.name}</button>`).join("");
  document.querySelectorAll(".guess-button").forEach((button) => button.addEventListener("click", () => chooseGuess(button)));
}

function chooseGuess(button) {
  if (!state.track || state.locked) return;
  state.locked = true;
  document.querySelectorAll(".guess-button").forEach((item) => item.classList.remove("selected"));
  button.classList.add("selected");
  const correct = button.dataset.player === state.track.owner;
  $("guessHint").textContent = correct ? "Nailed it. Great ears." : `It was ${state.track.owner}'s song.`;
  $("statusLabel").textContent = correct ? "Correct guess" : "Not quite this time";
  showToast(correct ? "+1 point · Nice work" : "The room knows now");
  setTimeout(() => { if (state.round < 5) startRound(); }, 1200);
}

function startRound() {
  state.round += 1; state.locked = false; state.track = state.tracks[(state.round - 1) % state.tracks.length];
  $("roundNumber").textContent = String(state.round).padStart(2, "0"); $("trackTitle").textContent = state.track.title; $("trackArtist").textContent = state.track.artist;
  $("playingLabel").textContent = "NOW PLAYING · MYSTERY TRACK"; $("statusLabel").textContent = "Make your guess"; $("guessHint").textContent = "Choose a player to lock in your guess"; renderGuesses();
  if (state.audio) { state.audio.pause(); state.audio = null; } $("playButton").textContent = "▶";
}

function showToast(message) { const toast = $("toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200); }
function startGame() { state.round = 0; startRound(); $("gamePanel").scrollIntoView({ behavior: "smooth", block: "center" }); }

$("startGame").addEventListener("click", startGame);
$("howToPlay").addEventListener("click", () => $("howPanel").classList.add("open"));
$("closeHow").addEventListener("click", () => $("howPanel").classList.remove("open"));
$("copyRoom").addEventListener("click", async () => { await navigator.clipboard?.writeText($("roomCode").textContent); showToast("Room code copied"); });
$("inviteButton").addEventListener("click", async () => { await navigator.clipboard?.writeText(`${location.href}#room=JAM-42`); showToast("Invite link copied"); });
$("leaveRoom").addEventListener("click", () => showToast("You are still welcome here"));
$("playButton").addEventListener("click", () => { if (!state.track) return showToast("Start the game to hear a track"); if (!state.track.preview_url) return showToast("Demo mode: imagine the first beat"); if (!state.audio) state.audio = new Audio(state.track.preview_url); if (state.audio.paused) { state.audio.play(); $("playButton").textContent = "Ⅱ"; } else { state.audio.pause(); $("playButton").textContent = "▶"; } });

// Set a Spotify client ID and use Authorization Code + PKCE before calling these methods.
const Spotify = { clientId: "", redirectUri: `${location.origin}${location.pathname}`, scopes: "user-read-private user-top-read", async authorize() { if (!this.clientId) return false; const verifier = crypto.randomUUID().replaceAll("-", ""); const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)); const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); sessionStorage.setItem("spotify_verifier", verifier); location.href = `https://accounts.spotify.com/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&code_challenge_method=S256&code_challenge=${challenge}&scope=${encodeURIComponent(this.scopes)}`; return true; }, async exchangeCode(code) { const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: this.clientId, grant_type: "authorization_code", code, redirect_uri: this.redirectUri, code_verifier: sessionStorage.getItem("spotify_verifier") }) }); if (!response.ok) throw new Error("Spotify token exchange failed"); return response.json(); }, async profile(token) { const response = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } }); return response.json(); }, async topTracks(token) { const response = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term", { headers: { Authorization: `Bearer ${token}` } }); return response.json(); } };

$("connectSpotify").addEventListener("click", async () => { if (!(await Spotify.authorize())) showToast("Add your Spotify client ID to enable connection"); });

async function completeSpotifyConnection() {
  const code = new URLSearchParams(location.search).get("code");
  if (!code || !Spotify.clientId) return;
  try {
    const token = await Spotify.exchangeCode(code);
    const [profile, tracks] = await Promise.all([Spotify.profile(token.access_token), Spotify.topTracks(token.access_token)]);
    const connectedPlayer = { name: profile.display_name || "Spotify friend", handle: `@${profile.id}`, color: "#49ad76", initials: (profile.display_name || "SF").slice(0, 2).toUpperCase() };
    state.players[0] = connectedPlayer;
    if (tracks.items?.length) state.tracks[0] = { title: tracks.items[0].name, artist: tracks.items[0].artists[0].name, owner: connectedPlayer.name, preview_url: tracks.items[0].preview_url };
    renderPlayers(); renderGuesses(); showToast("Spotify connected");
    history.replaceState({}, "", location.pathname);
  } catch (error) { showToast("Spotify connection could not be completed"); }
}

renderPlayers(); renderGuesses();
completeSpotifyConnection();