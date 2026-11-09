# ckruger.xyz

My personal website.

The homepage's alpine ASCII panorama is drawn locally by `assets/js/alpine.js`.
It loops through sunrise, daylight, sunset, and moonrise every 96 seconds.
The phase buttons hold a scene for inspection; `[play]` resumes the cycle.
Reduced-motion preferences start it paused, and off-screen or hidden tabs stop rendering.

Preview locally with `python3 -m http.server 8765 --bind 127.0.0.1`, then open
<http://127.0.0.1:8765/>.

The latest blog post section loads the Bear Blog RSS feed through the public
[rss2json API](https://rss2json.com/docs) using `assets/js/blog.js`. It displays
the newest post's linked title and publication date (UTC) on page load. A feed
URL cache key rotates every five minutes to avoid stale converter responses;
updates can take about five minutes plus any caching by Bear Blog, and are
subject to the service's rate limits. Refresh the page to check again.
If JavaScript is disabled or the feed cannot
be loaded, the section keeps the post included in the HTML. To change the blog
address, update `blogURL` in `assets/js/blog.js` and the navigation's blog link.

## /hi

`hi.html` is a plain-text man page served at <https://ckruger.xyz/hi>, for
`curl -s https://ckruger.xyz/hi`. 
