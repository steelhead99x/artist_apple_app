/**
 * ARTIST SPACE COMPLETE FEATURE EXTRACTOR
 *
 * This script will capture EVERYTHING from your Artist Space website
 * and export it in a format I can use to build the mobile app.
 *
 * HOW TO USE:
 * 1. Log in to https://stage-www.artist-space.com as booking agent
 * 2. Open DevTools (F12) → Console tab
 * 3. Copy and paste this ENTIRE script
 * 4. Press Enter
 * 5. Navigate through the site for 60 seconds
 * 6. Type: downloadFeatures()
 * 7. A JSON file will download - send that to me!
 */

(function() {
  console.log('%c🎵 ARTIST SPACE FEATURE EXTRACTOR ACTIVATED', 'color: #6366f1; font-size: 20px; font-weight: bold;');

  const features = {
    timestamp: new Date().toISOString(),
    userType: 'booking_agent',
    navigation: [],
    routes: [],
    apiCalls: [],
    forms: [],
    buttons: [],
    sections: {},
    localStorage: {},
    sessionStorage: {},
    currentUser: null,
  };

  // Extract current user info
  try {
    const storageKeys = ['user', 'currentUser', 'auth', 'token', 'authToken'];
    storageKeys.forEach(key => {
      const local = localStorage.getItem(key);
      const session = sessionStorage.getItem(key);
      if (local) features.localStorage[key] = local;
      if (session) features.sessionStorage[key] = session;
    });

    // Try to parse user data
    if (features.localStorage.user) {
      try {
        features.currentUser = JSON.parse(features.localStorage.user);
      } catch(e) {}
    }
  } catch(e) {
    console.warn('Could not extract storage:', e);
  }

  // Extract navigation links
  function extractNavigation() {
    const navLinks = document.querySelectorAll('nav a, [role="navigation"] a, header a, aside a');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      if (href && text && !features.navigation.find(n => n.href === href)) {
        features.navigation.push({
          text,
          href,
          fullUrl: link.href
        });
      }
    });
    console.log(`✅ Found ${features.navigation.length} navigation items`);
  }

  // Extract all buttons and their labels
  function extractButtons() {
    const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
    buttons.forEach(btn => {
      const text = btn.textContent.trim() || btn.value || btn.getAttribute('aria-label');
      const onClick = btn.getAttribute('onclick');
      if (text) {
        features.buttons.push({
          text,
          type: btn.type || 'button',
          onClick: onClick || 'unknown'
        });
      }
    });
  }

  // Extract forms
  function extractForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach((form, idx) => {
      const formData = {
        id: form.id || `form-${idx}`,
        action: form.action,
        method: form.method,
        fields: []
      };

      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        formData.fields.push({
          name: input.name,
          type: input.type || input.tagName.toLowerCase(),
          placeholder: input.placeholder,
          required: input.required,
          label: input.getAttribute('aria-label')
        });
      });

      features.forms.push(formData);
    });
  }

  // Extract page sections
  function extractSections() {
    const currentPath = window.location.pathname;
    const sections = document.querySelectorAll('section, [role="region"], main > div, .dashboard, .content');

    features.sections[currentPath] = {
      url: window.location.href,
      title: document.title,
      headings: [],
      content: []
    };

    // Extract headings
    document.querySelectorAll('h1, h2, h3, h4').forEach(h => {
      features.sections[currentPath].headings.push({
        level: h.tagName,
        text: h.textContent.trim()
      });
    });

    // Extract visible text content
    const mainContent = document.querySelector('main, [role="main"], .main-content');
    if (mainContent) {
      const paragraphs = mainContent.querySelectorAll('p, li, span');
      paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (text.length > 10 && text.length < 200) {
          features.sections[currentPath].content.push(text);
        }
      });
    }
  }

  // Intercept XHR/Fetch to capture API calls
  const originalXHR = window.XMLHttpRequest;
  const originalFetch = window.fetch;

  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;

    xhr.open = function(method, url, ...args) {
      features.apiCalls.push({
        type: 'XHR',
        method,
        url: url.toString(),
        timestamp: new Date().toISOString()
      });
      return originalOpen.apply(this, [method, url, ...args]);
    };

    return xhr;
  };

  window.fetch = function(url, options = {}) {
    features.apiCalls.push({
      type: 'fetch',
      method: options.method || 'GET',
      url: url.toString(),
      timestamp: new Date().toISOString()
    });
    return originalFetch.apply(this, arguments);
  };

  // Auto-extract on page changes
  let lastPath = window.location.pathname;
  setInterval(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      console.log(`📍 Page changed to: ${lastPath}`);
      extractSections();
      extractNavigation();
      extractButtons();
      extractForms();
    }
  }, 1000);

  // Initial extraction
  extractNavigation();
  extractButtons();
  extractForms();
  extractSections();

  // Function to download the collected data
  window.downloadFeatures = function() {
    console.clear();
    console.log('%c📊 FEATURE EXTRACTION COMPLETE!', 'color: #4CAF50; font-size: 18px; font-weight: bold;');
    console.log(`\n📡 API Calls Captured: ${features.apiCalls.length}`);
    console.log(`🗺️  Navigation Items: ${features.navigation.length}`);
    console.log(`📝 Forms Found: ${features.forms.length}`);
    console.log(`📄 Pages Visited: ${Object.keys(features.sections).length}`);
    console.log(`🔘 Buttons Found: ${features.buttons.length}`);

    // Remove duplicates from API calls
    const uniqueAPIs = Array.from(new Set(features.apiCalls.map(a => `${a.method} ${a.url}`)))
      .map(key => features.apiCalls.find(a => `${a.method} ${a.url}` === key));

    console.log('\n🔗 UNIQUE API ENDPOINTS:');
    uniqueAPIs.forEach(api => {
      console.log(`   ${api.method.padEnd(6)} ${api.url}`);
    });

    console.log('\n🗺️  NAVIGATION STRUCTURE:');
    features.navigation.forEach(nav => {
      console.log(`   ${nav.text} → ${nav.href}`);
    });

    console.log('\n📄 PAGES EXPLORED:');
    Object.keys(features.sections).forEach(path => {
      console.log(`   ${path} - ${features.sections[path].title}`);
      features.sections[path].headings.forEach(h => {
        console.log(`      ${h.level}: ${h.text}`);
      });
    });

    // Download as JSON file
    const dataStr = JSON.stringify(features, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `artist-space-features-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('\n✅ JSON file downloaded! Send it to Claude to build your app.');
    console.log('\n📋 You can also copy this data:');
    console.log('═════════════════════════════════════════');
    console.log(dataStr);
    console.log('═════════════════════════════════════════');

    return features;
  };

  console.log('\n✅ Extractor is running!');
  console.log('\n📝 INSTRUCTIONS:');
  console.log('   1. Navigate through the site (Dashboard, Search, Profile, Bookings, etc.)');
  console.log('   2. Click on different sections and features');
  console.log('   3. Wait 60 seconds while it captures everything');
  console.log('   4. Type: downloadFeatures()');
  console.log('   5. A JSON file will download');
  console.log('   6. Send that file to Claude!\n');

  return 'Extractor active! Navigate the site, then type: downloadFeatures()';
})();
