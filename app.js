// ==========================================
// 1. CẤU HÌNH KẾT NỐI VỚI SUPABASE
// ==========================================
// Thay thế URL và ANON_KEY bằng thông tin Dự án của bạn trong Supabase Dashboard
const supabaseUrl = 'https://qwoosgkddaovxtavskga.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b29zZ2tkZGFvdnh0YXZza2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjI0ODQsImV4cCI6MjA5ODI5ODQ4NH0.jaFpQq_Cvxo6NziBh__-rZVsUdqbHY1ShjF7JeeFJWo';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. HÀM CHUYỂN ĐỔI KHÓA VAPID (BẮT BUỘC)
// ==========================================
// Trình duyệt yêu cầu định dạng này để xác thực máy chủ gửi thông báo bảo mật
// HÀM MỚI CHUẨN HOÁ 100% ĐỂ SỬA LỖI PUSH SERVICE ERROR
function urlBase64ToUint8Array(base64String) {
  // Tự động thêm các dấu bằng '=' bị thiếu ở cuối chuỗi mã hóa
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  
  // Thay thế các ký tự đặc biệt theo đúng chuẩn URL-Safe Base64
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ==========================================
// 3. HÀM XIN QUYỀN VÀ ĐĂNG KÝ THÔNG BÁO ĐẨY
// ==========================================
async function subscribeUserToPush(userId) {
  // Kiểm tra xem trình duyệt có hỗ trợ tính năng chạy ngầm (Service Worker) không
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      console.log('Đang kích hoạt Service Worker chạy ngầm...');
      // A. Kích hoạt file sw.js chạy ngầm dưới trình duyệt
// DÒNG MỚI THAY THẾ (Ép trình duyệt nhận diện đúng thư mục dự án GitHub Pages):
// DÒNG MỚI THAY THẾ (Đơn giản, tương thích hoàn toàn với GitHub Pages):
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        
      console.log('Đang xin quyền hiển thị thông báo từ người dùng...');
      // B. Hỏi xin quyền "Cho phép hiển thị thông báo" (Hiện Pop-up Allow/Block)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Học sinh đã từ chối nhận thông báo đẩy.');
        return;
      }

      console.log('Quyền đã được cấp. Đang lấy mã định danh thiết bị (Token)...');
      // C. Thay chuỗi dưới đây bằng khóa Public Key bạn vừa tạo từ knock.app hoặc vapidkeys.com
      const publicVapidKey = 'BKJk1XCqwD3CA8Ozjh3uo5FlJFD9PksSvN3j6pWpapW02sg3iJxVSNedWzF0kkacjKgaCNrHoKiot16mgTG3cJo';
      
      // D. Đăng ký thiết bị với máy chủ Push của trình duyệt (Google/Apple)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      console.log('Đang lưu Token thiết bị lên bảng user_push_tokens của Supabase...');
      // E. Lưu hoặc cập nhật (Ghi đè nếu đã tồn tại) Token vào bảng user_push_tokens
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({ 
          user_id: userId, 
          push_token: JSON.stringify(subscription) 
        });

      if (error) {
        throw new Error('Lỗi Supabase: ' + error.message);
      }
      
      console.log('Chúc mừng! Đăng ký nhận thông báo kể cả khi tắt tab thành công!');
    } catch (error) {
      console.error('Quá trình cài đặt Push Notification thất bại:', error);
    }
  } else {
    console.warn('Trình duyệt này không hỗ trợ tính năng Web Push Notifications.');
  }
}

// ==========================================
// 4. KÍCH HOẠT TỰ ĐỘNG KHI ĐĂNG NHẬP THÀNH CÔNG
// ==========================================
// Đoạn mã này sẽ theo dõi trạng thái đăng nhập của ứng dụng Class Chat.
// Ngay khi học sinh Đăng nhập hoặc Tạo tài khoản thành công, hàm đăng ký thông báo sẽ chạy.
supabase.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
    const userId = session.user.id;
    console.log('Học sinh đăng nhập thành công. ID:', userId);
    
    // Kích hoạt tính năng thông báo từ xa cho học sinh này
    subscribeUserToPush(userId);
  }
});
