function showToast(type, message) {
  const toast = document.getElementById(`toast-${type}`);

  if (!toast) return;

  toast.querySelector(".toast-message").textContent = message;

  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}
