// File: sw.js
self.addEventListener('push', function(event) {
  console.log('Đã nhận sự kiện push từ Edge Function!');
  
  let payload = event.data ? event.data.text() : 'Bạn có tin nhắn mới!';
  let data = {};
  
  try {
    data = JSON.parse(payload);
  } catch (e) {
    data = { title: 'Class Chat 📚', body: payload };
  }

  const options = {
    body: data.body,
    icon: 'https://cdn.modrinth.com/data/tADpI62B/8cc7e6f98e2716210e7d6290af68347f620fa0f6.png', // Dùng dấu chấm '.' để chạy đúng cấu trúc thư mục con của GitHub Pages
    badge: 'https://cdn.modrinth.com/data/tADpI62B/8cc7e6f98e2716210e7d6290af68347f620fa0f6.png',     
    vibrate: [200, 100, 200], // Định dạng chuẩn: Rung 200ms, nghỉ 100ms, rồi rung tiếp 200ms
    data: {
      url: data.url || '/'   
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Xử lý khi người dùng bấm vào dòng thông báo
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); 
  
  const targetUrl = new URL(event.notification.data.url, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
