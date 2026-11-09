(async function () {
  'use strict';

  const content = document.getElementById('latest-post-content');
  if (!content) return;

  const blogURL = 'https://ckruger.bearblog.dev/blog/';
  const feedURL = new URL('/feed/?type=rss', blogURL);
  // The converter caches by feed URL. Rotate that URL every five minutes
  // so a newly published post does not remain hidden behind its stale cache.
  feedURL.searchParams.set('refresh', Math.floor(Date.now() / (5 * 60 * 1000)));
  // Convert the public RSS feed to JSON so this works on static hosting
  // without requiring Bear Blog to allow cross-origin browser requests.
  const endpoint = new URL('https://api.rss2json.com/v1/api.json');
  endpoint.searchParams.set('rss_url', feedURL.href);

  try {
    const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Feed unavailable');
    const feed = await response.json();
    if (feed.status !== 'ok' || !Array.isArray(feed.items)) return;

    const posts = feed.items.map(function (item) {
      // rss2json returns UTC dates as "YYYY-MM-DD HH:mm:ss".
      const published = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(item.pubDate)
        ? item.pubDate.replace(' ', 'T') + 'Z' : item.pubDate;
      return { item: item, date: new Date(published) };
    }).filter(function (post) {
      return typeof post.item.title === 'string' && post.item.title.trim()
        && typeof post.item.link === 'string' && Number.isFinite(post.date.getTime());
    }).sort(function (a, b) { return b.date - a.date; });

    const latest = posts[0];
    if (!latest) return;
    const url = new URL(latest.item.link, blogURL);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

    const link = document.createElement('a');
    link.href = url.href;
    link.textContent = latest.item.title;

    const time = document.createElement('time');
    time.dateTime = latest.date.toISOString();
    time.textContent = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
    }).format(latest.date);

    content.replaceChildren(link, time);
  } catch (_) {
    // Keep the existing post when the feed or conversion service is unavailable.
  }
})();
