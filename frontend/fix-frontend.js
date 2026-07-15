const fs = require('fs');

function updatePage(path, platformBase) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /await axios\.post\(\`\$\{baseURL\}\/(.*?)\/manual\/comment\`, \{\n\s+accountId: selectedAccount\._id,\n\s+targetId,\n\s+type,\n\s+text: messageText\n\s+\}/g,
    `await axios.post(\`\${baseURL}/\${platformBase}/manual/\${selectedAccount._id}/comments/\${targetId}/reply\`, { text: messageText }`
  );
  fs.writeFileSync(path, content);
}

updatePage('src/pages/FacebookToolPage.jsx', 'facebook');
updatePage('src/pages/YouTubeToolPage.jsx', 'youtube');
updatePage('src/pages/LinkedInToolPage.jsx', 'social-hub/linkedin');
