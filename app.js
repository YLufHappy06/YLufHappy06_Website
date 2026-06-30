// File: app.js (Bản hoàn chỉnh tối ưu tốc độ Lazy Loading + Supabase Key thực tế)

// 1. Cấu hình thông tin kết nối Supabase và VAPID Key thật của dự án
const SUPABASE_URL = 'https://qwoosgkddaovxtavskga.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b29zZ2tkZGFvdnh0YXZza2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjI0ODQsImV4cCI6MjA5ODI5ODQ4NH0.jaFpQq_Cvxo6NziBh__-rZVsUdqbHY1ShjF7JeeFJWo';
const publicVapidKey = 'BKJk1XCqwD3CA8Ozjh3uo5FlJFD9PksSvN3j6pWpapW02sg3iJxVSNedWzF0kkacjKgaCNrHoKiot16mgTG3cJo'; 

let supabase = null;
const notiBtn = document.getElementById('push-noti-btn');

// 2. Kích hoạt kết nối Supabase ngay khi cấu trúc DOM của trang web vừa sẵn sàng
window.addEventListener('DOMContentLoaded', () => {
  try {
    if (window.supabase) {
      // Khởi tạo client kết nối bảo mật qua đối tượng toàn cục window
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("Supabase đã kết nối thành công!");
      
      // Chạy hàm lắng nghe trạng thái đăng nhập của người dùng
      startAuthListener();
    } else {
      console.error("Lỗi: Không tìm thấy thư viện Supabase CDN trong file index.html");
    }
  } catch (error) {
    console.error("Lỗi khởi tạo hệ thống ban đầu:", error);
  }
});

// 3. Hàm kiểm tra trạng thái tài khoản người dùng
function startAuthListener() {
  if (!supabase) return;
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      const currentUserId = session.user.id;
      console.log('Người dùng đã đăng nhập. ID:', currentUserId);
      
      // Hiển thị trạng thái nút bấm (Đang bật hoặc Đang tắt) lên màn hình ngay lập tức
      updateButtonUI();
      
      // Gán sự kiện Click chuột (Luồng xử lý Service Worker nặng chỉ chạy khi người dùng CHỦ ĐỘNG BẤM)
      notiBtn.onclick = async () => {
        notiBtn.disabled = true; // Khóa nút tạm thời để tránh bấm liên tục gây loạn luồng
        await handleNotificationToggle(currentUserId);
        notiBtn.disabled = false; // Mở khóa nút sau khi xử lý xong
      };
    } else {
      console.log('Người dùng chưa đăng nhập.');
      if (notiBtn) {
        notiBtn.innerText = '🔒 Đăng nhập để cấu hình thông báo';
        notiBtn.className = 'noti-btn-disabled';
        notiBtn.onclick = null;
      }
    }
  });
}

// 4. Hàm cập nhật giao diện nút bấm gọn nhẹ (Không gọi Service Worker tại đây để tránh lag trang)
async function updateButtonUI() {
  if (!notiBtn) return;
  
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    notiBtn.innerText = '🚫 Trình duyệt không hỗ trợ thông báo';
    notiBtn.className = 'noti-btn-disabled';
    notiBtn.disabled = true;
    return;
  }
  
  // Đọc trực tiếp trạng thái quyền hiện tại của trình duyệt để hiển thị chữ
  if (Notification.permission === 'granted') {
    notiBtn.innerText = '🟢 Đã bật thông báo (Bấm để Tắt)';
    notiBtn.className = 'noti-btn-on';
  } else {
    notiBtn.innerText = '🔴 Đang tắt thông báo (Bấm để Bật)';
    notiBtn.className = 'noti-btn-off';
  }
}

// 5. Cơ chế Lazy Loading: Chỉ kích hoạt đăng ký Service Worker và xin quyền Push KHI NGƯỜI DÙNG BẤM NÚT
async function handleNotificationToggle(userId) {
  if (!supabase) return;
  
  try {
    console.log('Bắt đầu kích hoạt luồng đăng ký Web Push...');
    // Đăng ký Service Worker với đường dẫn tương đối tối ưu cho hạ tầng GitHub Pages
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    let subscription = await registration.pushManager.getSubscription();

    // TRƯỜNG HỢP 1: NẾU ĐANG BẬT -> TIẾN HÀNH TẮT (HỦY ĐĂNG KÝ)
    if (subscription) {
      // Hủy gói nhận tin nhắn trên máy chủ Push trình duyệt
      await subscription.unsubscribe();

      // Xóa vĩnh viễn dòng token này khỏi bảng user_push_tokens của Supabase
      await supabase.from('user_push_tokens').delete().eq('user_id', userId);

      notiBtn.innerText = '🔴 Đang tắt thông báo (Bấm để Bật)';
      notiBtn.className = 'noti-btn-off';
      console.log('Đã tắt thông báo thành công và xóa dữ liệu database.');
    } 
    // TRƯỜNG HỢP 2: NẾU ĐANG TẮT -> TIẾN HÀNH BẬT (ĐĂNG KÝ MỚI)
    else {
      // Kích hoạt cửa sổ Pop-up xin quyền hệ thống (Chỉ chạy được mượt mà trên iPhone/Android khi có tương tác click)
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('Bạn cần cấp quyền thông báo cho trang web trong phần Cài đặt của trình duyệt hoặc Điện thoại.');
        notiBtn.innerText = '🔴 Đang tắt thông báo (Bấm để Bật)';
        notiBtn.className = 'noti-btn-off';
        return;
      }

      // Tạo chuỗi mã hóa Token mới gửi lên tổng đài của Google/Apple
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // Lưu đè hoặc Thêm mới bản ghi token chuẩn hóa này lên cơ sở dữ liệu Supabase
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          push_token: JSON.stringify(subscription)
        });

      if (error) throw error;

      notiBtn.innerText = '🟢 Đã bật thông báo (Bấm để Tắt)';
      notiBtn.className = 'noti-btn-on';
      console.log('Đã kích hoạt và lưu token thành công lên Supabase!');
    }
  } catch (error) {
    console.error('Lỗi trong luồng xử lý thông báo:', error);
    
    // Khắc phục nhanh: Nếu vấp phải lỗi lệch khóa cũ kẹt ngầm, tiến hành dọn dẹp để bấm lần sau là được ngay
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch (e) {}
    
    alert('Hệ thống đang đồng bộ cấu hình, vui lòng bấm nút lại một lần nữa!');
  }
}

// HÀM BỔ TRỢ: Mã hóa chuỗi VAPID Public Key thành mảng Uint8Array đúng chuẩn mạng quốc tế
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
