use tauri::{Listener, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Configure window size constraints based on screen size
      let app_handle = app.handle().clone();

      // Try to get the main window and configure it
      if let Some(window) = app.get_webview_window("main") {
        configure_window_constraints(&window);
      }

      // Also listen for window creation events
      app.listen("tauri://window-created", move |_event| {
        if let Some(window) = app_handle.get_webview_window("main") {
          configure_window_constraints(&window);
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn configure_window_constraints(window: &tauri::WebviewWindow) {
  // Get the primary monitor
  if let Ok(monitor) = window.primary_monitor() {
    if let Some(monitor) = monitor {
      let screen_size = monitor.size();

      // Calculate max dimensions (screen size minus ~200px)
      let max_width = (screen_size.width as i32 - 200).max(800) as u32;
      let max_height = (screen_size.height as i32 - 200).max(600) as u32;

      // Set the maximum size constraints
      let _ = window.set_max_size(Some(tauri::LogicalSize::new(max_width, max_height)));

      // If current window is larger than max size, resize it
      if let Ok(current_size) = window.inner_size() {
        let current_width = current_size.width;
        let current_height = current_size.height;

        if current_width > max_width || current_height > max_height {
          let new_width = current_width.min(max_width);
          let new_height = current_height.min(max_height);
          let _ = window.set_size(tauri::LogicalSize::new(new_width, new_height));
        }
      }
    }
  }
}
