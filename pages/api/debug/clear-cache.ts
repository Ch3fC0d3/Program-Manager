import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This endpoint helps clear browser cache issues
  // Return HTML that clears everything and redirects
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Clearing Cache...</title>
  <script>
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(function(names) {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
    
    // Redirect to login after 2 seconds
    setTimeout(function() {
      window.location.href = '/login';
    }, 2000);
  </script>
</head>
<body style="font-family: system-ui; text-align: center; padding: 50px;">
  <h1>🧹 Clearing cache and storage...</h1>
  <p>Unregistering service workers...</p>
  <p>Clearing local storage...</p>
  <p>Deleting all caches...</p>
  <p style="margin-top: 30px; color: #666;">You will be redirected to login in 2 seconds...</p>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(200).send(html);
}
