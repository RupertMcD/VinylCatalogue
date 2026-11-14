// Chooses which screen to show from the part of the address after "#",
// for example "#/record/abc" shows the detail screen for record "abc".

let routes = [];
let mountPoint = null;
let renderCount = 0;

// Turns "/record/:id" into a pattern and pulls out the named parts.
export function matchRoute(routeList, path) {
  for (const route of routeList) {
    const names = [];
    const pattern = route.path.replace(/:(\w+)/g, (_, name) => {
      names.push(name);
      return '([^/]+)';
    });
    const match = path.match(new RegExp(`^${pattern}$`));
    if (match) {
      const params = {};
      names.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

export function currentPath() {
  return location.hash.slice(1) || '/';
}

// Moves to another screen. "replace" swaps the current history entry
// instead of adding one, so Back skips it.
export function navigate(path, { replace = false } = {}) {
  const url = `#${path}`;
  if (replace) {
    history.replaceState(history.state, '', url);
  } else {
    history.pushState({ inApp: true }, '', url);
  }
  renderCurrent();
}

// Goes back if we got here from inside the app, otherwise to a sensible screen.
export function goBack(fallbackPath = '/') {
  if (history.state && history.state.inApp) {
    history.back();
  } else {
    navigate(fallbackPath, { replace: true });
  }
}

async function renderCurrent() {
  const path = currentPath();
  const found = matchRoute(routes, path);
  if (!found) {
    navigate('/', { replace: true });
    return;
  }

  const thisRender = ++renderCount;
  let node;
  try {
    node = await found.route.render(found.params);
  } catch (error) {
    console.error(error);
    node = errorScreen();
  }

  // If the person moved on while this screen was loading, don't show it.
  if (thisRender !== renderCount) return;

  mountPoint.replaceChildren(node);
  window.scrollTo(0, node.initialScrollY ?? 0);
}

function errorScreen() {
  const node = document.createElement('div');
  node.innerHTML = `
    <div class="empty-state">
      <h2>Something went wrong</h2>
      <p>That screen couldn't be shown. Your records are safe.</p>
      <a class="pill-button" href="#/">Back to Collection</a>
    </div>`;
  return node;
}

export function startRouter(element, routeList) {
  mountPoint = element;
  routes = routeList;

  window.addEventListener('hashchange', renderCurrent);

  // In-app links go through navigate() so Back buttons know where they came from.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#/"]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.getAttribute('href').slice(1));
  });

  renderCurrent();
}
