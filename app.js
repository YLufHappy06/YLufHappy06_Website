// File: app.js (Bản vá tối ưu hóa tối đa, dọn dẹp lỗi Subscription ẩn trên iOS PWA)

(() => {
  const CONFIG_URL = 'https://qwoosgkddaovxtavskga.supabase.co'; 
  const CONFIG_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b29zZ2tkZGFvdnh0YXZza2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjI0ODQsImV4cCI6MjA5ODI5ODQ4NH0.jaFpQq_Cvxo6NziBh__-rZVsUdqbHY1ShjF7JeeFJWo';
  const publicVapidKey = 'BKJk1XCqwD3CA8Ozjh3uo5FlJFD9PksSvN3j6pWpapW02sg3iJxVSNedWzF0kkacjKgaCNrHoKiot16mgTG3cJo'; 

  let supabase = null;
  const notiBtn = document.getElementById('push-noti-btn');

  window.addEventListener('DOMContentLoaded', () => {
    try {
      if (window.supabase) {
        supabase = window.supabase.createClient(CONFIG_URL, CONFIG_KEY);
        console.log("Kết nối Supabase hoàn tất!");
        startAuthListener();
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
        updateButtonUI();
        
        notiBtn.onclick = async () => {
          notiBtn.disabled = true;
          await handleNotificationToggle(currentUserId);
          notiBtn.disabled = false;
        };
      } else {
        if (notiBtn) {
          notiBtn.innerText = '🔒 Notification';
          notiBtn.className = 'noti-btn-disabled';
          notiBtn.onclick = null;
        }
      }
    });
  }

  async function updateButtonUI() {
    if (!notiBtn) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      notiBtn.innerText = '🚫 Notification is not available';
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (Notification.permission === 'granted' && subscription) {
        notiBtn.innerText = '🟢 Notification: On';
      } else {
        notiBtn.innerText = '🔴 Notification: Off';
      }
    } catch (e) {
      notiBtn.innerText = '🔴 Notification: Off)';
    }
  }

  async function handleNotificationToggle(userId) {
    if (!supabase) return;
    try {
      console.log('Bắt đầu xử lý đăng ký...');
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      
      // Đợi Service Worker kích hoạt hoàn toàn để tránh lỗi bất đồng bộ trên iOS
      await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();

      // TRƯỜNG HỢP 1: TẮT THÔNG BÁO
      if (subscription) {
        await subscription.unsubscribe();
        await supabase.from('user_push_tokens').delete().eq('user_id', userId);
        notiBtn.innerText = '🔴 Notification: Off';
        console.log('Đã tắt thông báo thành công.');
      } 
      // TRƯỜNG HỢP 2: BẬT THÔNG BÁO
      else {
        const permission = await Notification.requestPermission();
        console.log('Quyền thông báo:', permission);
        
        if (permission !== 'granted') {
          alert('Vui lòng cấp quyền thông báo trong Cài đặt iPhone của bạn.');
          return;
        }

        // ÉP CHẠY LỆNH: Kiểm tra và dọn dẹp sạch sẽ các subscription rác ẩn nếu có lỗi key cũ kẹt ngầm
        try {
          const checkSub = await registration.pushManager.getSubscription();
          if (checkSub) await checkSub.unsubscribe();
        } catch (cleanError) {
          console.log('Dọn dẹp rác qua bỏ:', cleanError);
        }

        console.log('Đang gọi subscribe từ nhà mạng...');
        const convertedKey = urlBase64ToUint8Array(publicVapidKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        console.log('Đã lấy được Subscription thành công, chuẩn bị gửi lên Supabase.');

        await supabase.from('user_push_tokens').upsert({
          user_id: userId,
          push_token: JSON.stringify(subscription)
        });

        notiBtn.innerText = '🟢 Notification: On';
        console.log('Đã lưu token lên database thành công!');
      }
    } catch (error) {
      console.error('Lỗi nghiêm trọng trong luồng xử lý thông báo iOS:', error);
      // Phương án cứu cánh tự động dọn dẹp lỗi InvalidStateError của Apple
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      } catch (e) {}
      alert('Hệ thống đang đồng bộ với máy chủ Apple, vui lòng bấm lại một lần nữa!');
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
})();
