# ckruger.xyz

My personal website.

The homepage's alpine ASCII panorama is drawn locally by `assets/js/alpine.js`.
It loops through sunrise, daylight, sunset, and moonrise every 96 seconds.
The phase buttons hold a scene for inspection; `[play]` resumes the cycle.
Reduced-motion preferences start it paused, and off-screen or hidden tabs stop rendering.

Preview locally with `python3 -m http.server 8765 --bind 127.0.0.1`, then open
<http://127.0.0.1:8765/>.

## /hi

`hi.html` is a plain-text man page served at <https://ckruger.xyz/hi>, for
`curl -s https://ckruger.xyz/hi`. 
