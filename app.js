// File: app.js (Bản đầy đủ hoàn chỉnh)

// 1. Cấu hình kết nối Supabase (BẠN HÃY THAY THÔNG TIN THẬT CỦA BẠN VÀO ĐÂY)
const SUPABASE_URL = 'https://qwoosgkddaovxtavskga.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b29zZ2tkZGFvdnh0YXZza2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjI0ODQsImV4cCI6MjA5ODI5ODQ4NH0.jaFpQq_Cvxo6NziBh__-rZVsUdqbHY1ShjF7JeeFJWo';
const publicVapidKey = 'BKJk1XCqwD3CA8Ozjh3uo5FlJFD9PksSvN3j6pWpapW02sg3iJxVSNedWzF0kkacjKgaCNrHoKiot16mgTG3cJo'; // Khóa public chuẩn của bạn

// Khởi tạo client Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const notiBtn = document.getElementById('push-noti-btn');

// 2. Kiểm tra trạng thái đăng nhập của người dùng
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    const currentUserId = session.user.id;
    console.log('Đã đăng nhập với User ID:', currentUserId);
    // Kích hoạt nút thông báo ngay sau khi đăng nhập thành công
    initNotificationButton(currentUserId);
  } else {
    console.log('Chưa đăng nhập hoặc đã đăng xuất.');
    if (notiBtn) {
      notiBtn.innerText = '🔒 Đăng nhập để cấu hình thông báo';
      notiBtn.className = 'noti-btn-disabled';
      notiBtn.onclick = null;
    }
  }
});

// 3. Hàm khởi chạy ban đầu để cập nhật trạng thái nút bấm 🔔
async function initNotificationButton(currentUserId) {
  if (!notiBtn) return; // Nếu giao diện chưa có nút thì dừng lại

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    notiBtn.innerText = '🚫 Trình duyệt không hỗ trợ thông báo';
    notiBtn.className = 'noti-btn-disabled';
    notiBtn.disabled = true;
    return;
  }

  try {
    // Đăng ký Service Worker với đường dẫn tương đối dành cho GitHub Pages
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    console.log('Service Worker hoạt động ổn định:', registration);

    const subscription = await registration.pushManager.getSubscription();

    if (subscription && Notification.permission === 'granted') {
      notiBtn.innerText = '🟢 Đã bật thông báo (Bấm để Tắt)';
      notiBtn.className = 'noti-btn-on';
    } else {
      notiBtn.innerText = '🔴 Đang tắt thông báo (Bấm để Bật)';
      notiBtn.className = 'noti-btn-off';
    }

    // Lắng nghe sự kiện click chuột (Bắt buộc có để vượt qua bảo mật nghiêm ngặt của iPhone/iOS)
    notiBtn.onclick = async () => {
      notiBtn.disabled = true; // Chặn bấm liên tục khi đang xử lý
      await toggleNotification(currentUserId);
      notiBtn.disabled = false;
    };

  } catch (error) {
    console.error('Lỗi khởi tạo Service Worker:', error);
  }
}

// 4. Hàm xử lý Bật/Tắt khi bấm nút
async function toggleNotification(userId) {
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // TRƯỜNG HỢP 1: NẾU ĐANG BẬT -> TIẾN HÀNH TẮT (HỦY ĐĂNG KÝ)
    if (subscription) {
      // Hủy gói trên máy chủ Push trình duyệt
      await subscription.unsubscribe();

      // Xóa bản ghi token này khỏi bảng user_push_tokens trên Supabase
      const { error } = await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) console.error('Lỗi xóa token trên Supabase:', error);

      notiBtn.innerText = '🔴 Đang tắt thông báo (Bấm để Bật)';
      notiBtn.className = 'noti-btn-off';
      console.log('Đã hủy nhận thông báo thành công.');
    } 
    // TRƯỜNG HỢP 2: NẾU ĐANG TẮT -> TIẾN HÀNH BẬT (ĐĂNG KÝ MỚI)
    else {
      // Hỏi xin quyền chính thức (iOS iPhone sẽ hiện Pop-up của Apple ngay tại đây)
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('Bạn cần cấp quyền thông báo cho trang web trong phần Cài đặt trình duyệt hoặc Cài đặt điện thoại.');
        notiBtn.innerText = '🔴 Đang tắt thông báo (Bấm để Bật)';
        notiBtn.className = 'noti-btn-off';
        return;
      }

      // Tạo gói Subscription mới gửi lên nhà mạng Google/Apple để xin Token
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // Lưu hoặc Cập nhật dữ liệu token mới này lên bảng user_push_tokens của Supabase
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          push_token: JSON.stringify(subscription)
        });

      if (error) throw new Error('Lỗi khi lưu Supabase: ' + error.message);

      notiBtn.innerText = '🟢 Đã bật thông báo (Bấm để Tắt)';
      notiBtn.className = 'noti-btn-on';
      console.log('Đã kích hoạt và lưu token thành công!');
    }
  } catch (err) {
    console.error('Quá trình cài đặt Push Notification thất bại:', err);
    alert('Cài đặt thông báo thất bại, vui lòng thử lại.');
  }
}

// HÀM BỔ TRỢ: Chuyển đổi chuỗi VAPID Key sang mảng Uint8Array chuẩn cấu trúc mạng
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
