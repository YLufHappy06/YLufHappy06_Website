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
    icon: '/icon.png',       
    badge: '/badge.png',     
    vibrate:, // Sửa lại mảng rung chuẩn cho Android
    data: {
      url: data.url || '/'   // Lấy URL động từ database gửi sang nếu có, mặc định là trang chủ
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Xử lý khi người dùng bấm vào dòng thông báo
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); 
  
  // Lấy URL đích được gắn kèm trong thông báo (ví dụ: "https://yourdomain.com")
  const targetUrl = new URL(event.notification.data.url, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Kiểm tra xem đã có tab nào đang mở đúng URL đó chưa
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Nếu không tìm thấy tab cũ trùng URL, tiến hành mở tab mới
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
