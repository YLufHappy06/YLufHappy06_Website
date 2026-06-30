const SUPABASE_URL = 'https://qwoosgkddaovxtavskga.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b29zZ2tkZGFvdnh0YXZza2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjI0ODQsImV4cCI6MjA5ODI5ODQ4NH0.jaFpQq_Cvxo6NziBh__-rZVsUdqbHY1ShjF7JeeFJWo';
const publicVapidKey = 'BKJk1XCqwD3CA8Ozjh3uo5FlJFD9PksSvN3j6pWpapW02sg3iJxVSNedWzF0kkacjKgaCNrHoKiot16mgTG3cJo'; 

let supabase = null;
const notiBtn = document.getElementById('push-noti-btn');

// Chỉ kết nối Supabase sau khi cấu trúc trang web (DOM) đã hiển thị lên màn hình
window.addEventListener('DOMContentLoaded', () => {
  try {
    if (window.supabase) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("Kết nối Supabase thành công!");
      startAuthListener();
    } else {
      console.error("Thiếu thư viện Supabase CDN");
    }
  } catch (error) {
    console.error("Lỗi hệ thống:", error);
  }
});

function startAuthListener() {
  if (!supabase) return;
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      const currentUserId = session.user.id;
      // Gọi hàm cập nhật chữ lên nút bấm
      updateButtonUI();
      
      notiBtn.onclick = async () => {
        notiBtn.disabled = true;
        await handleNotificationToggle(currentUserId);
        notiBtn.disabled = false;
      };
    } else {
      if (notiBtn) {
        notiBtn.innerText = '🔒 Đăng nhập để cấu hình thông báo';
        notiBtn.className = 'noti-btn-disabled';
        notiBtn.onclick = null;
      }
    }
  });
}

// Hàm kiểm tra trạng thái token trình duyệt để hiển thị chữ chuẩn xác
async function updateButtonUI() {
  if (!notiBtn) return;
  
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    notiBtn.innerText = '🚫 Không hỗ trợ thông báo';
    notiBtn.className = 'noti-btn-disabled';
    notiBtn.disabled = true;
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (Notification.permission === 'granted' && subscription) {
      notiBtn.innerText = '🟢 Đã bật thông báo (Bấm để Tắt)';
      notiBtn.className = 'noti-btn-on';
    } else {
      notiBtn.innerText = '🔴 Đang tắt thông báo (Bấm để Bật)';
      notiBtn.className = 'noti-btn-off';
    }
  } catch (error) {
    if (Notification.permission === 'granted') {
      notiBtn.innerText = '🟢 Đã bật thông báo (Bấm để Tắt)';
      notiBtn.className = 'noti-btn-on';
    } else {
      notiBtn.innerText = '🔴 Đang tắt thông báo (Bấm để Bật)';
      notiBtn.className = 'noti-btn-off';
    }
  }
}

async function handleNotificationToggle(userId) {
  if (!supabase) return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await supabase.from('user_push_tokens').delete().eq('user_id', userId);
      notiBtn.innerText = '🔴 Đang tắt thông báo (Bấm để Bật)';
      notiBtn.className = 'noti-btn-off';
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Vui lòng cấp quyền thông báo trong Cài đặt hệ thống.');
        return;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      await supabase.from('user_push_tokens').upsert({
        user_id: userId,
        push_token: JSON.stringify(subscription)
      });

      notiBtn.innerText = '🟢 Đã bật thông báo (Bấm để Tắt)';
      notiBtn.className = 'noti-btn-on';
    }
  } catch (error) {
    console.error('Lỗi luồng thông báo:', error);
    alert('Hệ thống đang đồng bộ, vui lòng bấm nút lại lần nữa!');
  }
}

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
