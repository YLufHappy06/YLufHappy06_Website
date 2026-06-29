// File: sw.js
self.addEventListener('push', function(event) {
  // Nhận dữ liệu text từ Supabase gửi sang
  let payload = event.data ? event.data.text() : 'Bạn có tin nhắn mới!';
  let data = {};
  
  try {
    data = JSON.parse(payload);
  } catch (e) {
    data = { title: 'Class Chat 📚', body: payload };
  }

  const options = {
    body: data.body,
    icon: '/icon.png',       // Thay bằng ảnh logo của bạn nếu có
    badge: '/badge.png',     // Biểu tượng nhỏ trên thanh thông báo Android
    vibrate: true, // Rung điện thoại nếu là Android
    data: {
      url: '/'               // Đường dẫn sẽ mở khi bấm vào thông báo
    }
  };

  // Ra lệnh cho hệ điều hành hiển thị thông báo dạng Pop-up hệ thống
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Xử lý khi người dùng bấm vào dòng thông báo trên màn hình máy tính/điện thoại
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Đóng thông báo lại
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Nếu tab đang mở nhưng bị thu nhỏ, tự động tối ưu hóa và đưa tab lên trước mặt
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Nếu tab đã bị tắt hoàn toàn, mở một tab mới
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
