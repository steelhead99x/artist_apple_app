/**
 * Artist Space API Extractor
 *
 * HOW TO USE:
 * 1. Log in to https://stage-www.artist-space.com in your browser
 * 2. Open DevTools (F12 or Right-click → Inspect)
 * 3. Go to the Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 6. The script will extract API endpoints and features
 * 7. Copy the output and share it with me!
 */

(function extractArtistSpaceInfo() {
  console.log('🎵 Artist Space API Extractor Started...\n');

  const info = {
    apiEndpoints: [],
    routes: [],
    features: [],
    navigation: [],
    currentUser: null,
    timestamp: new Date().toISOString()
  };

  // Extract current user from localStorage or sessionStorage
  try {
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
    const userData = localStorage.getItem('user') || localStorage.getItem('currentUser');

    if (userData) {
      info.currentUser = JSON.parse(userData);
      console.log('✅ Found current user data');
    }
  } catch (e) {
    console.log('⚠️ Could not extract user data from storage');
  }

  // Extract navigation links from the page
  try {
    const navLinks = document.querySelectorAll('nav a, [role="navigation"] a, header a');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      if (href && text) {
        info.navigation.push({ text, href });
      }
    });
    console.log(`✅ Found ${info.navigation.length} navigation links`);
  } catch (e) {
    console.log('⚠️ Could not extract navigation');
  }

  // Extract routes from React Router (if available)
  try {
    // Try to find React Router instance
    const reactRoot = document.getElementById('root');
    if (reactRoot && reactRoot._reactRootContainer) {
      console.log('✅ React app detected');
    }
  } catch (e) {
    console.log('⚠️ Could not detect React Router');
  }

  // Intercept XHR requests to capture API endpoints
  console.log('\n📡 Monitoring API calls... (click around the site for 30 seconds)\n');
  console.log('Then type: showExtractedData() to see results\n');

  const originalXHR = window.XMLHttpRequest;
  const originalFetch = window.fetch;

  // Intercept XHR
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;

    xhr.open = function(method, url, ...args) {
      info.apiEndpoints.push({
        method,
        url: url.toString(),
        type: 'XHR'
      });
      return originalOpen.apply(this, [method, url, ...args]);
    };

    return xhr;
  };

  // Intercept fetch
  window.fetch = function(url, options = {}) {
    info.apiEndpoints.push({
      method: options.method || 'GET',
      url: url.toString(),
      type: 'fetch'
    });
    return originalFetch.apply(this, arguments);
  };

  // Function to display collected data
  window.showExtractedData = function() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║          Artist Space Extracted Information           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📊 SUMMARY:');
    console.log(`   - API Endpoints Found: ${info.apiEndpoints.length}`);
    console.log(`   - Navigation Items: ${info.navigation.length}`);
    console.log(`   - Current User: ${info.currentUser ? 'Yes' : 'No'}\n`);

    if (info.currentUser) {
      console.log('👤 CURRENT USER:');
      console.log(JSON.stringify(info.currentUser, null, 2));
      console.log('\n');
    }

    console.log('🗺️ NAVIGATION:');
    info.navigation.forEach(item => {
      console.log(`   ${item.text} → ${item.href}`);
    });
    console.log('\n');

    console.log('📡 API ENDPOINTS:');
    const uniqueEndpoints = [...new Set(info.apiEndpoints.map(e => `${e.method} ${e.url}`))];
    uniqueEndpoints.forEach(endpoint => {
      console.log(`   ${endpoint}`);
    });
    console.log('\n');

    console.log('📋 COPY THIS JSON (select and copy):');
    console.log('═══════════════════════════════════════════════════════');
    console.log(JSON.stringify(info, null, 2));
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('✅ Done! Copy the JSON above and share with Claude.');

    return info;
  };

  console.log('✅ Extractor initialized!');
  console.log('\n📝 INSTRUCTIONS:');
  console.log('   1. Click around the site (Dashboard, Search, Profile, etc.)');
  console.log('   2. Wait 30 seconds to capture API calls');
  console.log('   3. Type: showExtractedData()');
  console.log('   4. Copy the JSON output and share it\n');

  return 'Extractor running... Click around the site, then type: showExtractedData()';
})();
