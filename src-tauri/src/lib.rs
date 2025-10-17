// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri_plugin_sql::{Migration, MigrationKind};
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/0000_wealthy_hiroim.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "book_id_in_daily_stats_is_string",
            sql: include_str!("../migrations/0001_skinny_dark_beast.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "remove_user_id_column",
            sql: include_str!("../migrations/0002_clever_tombstone.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_daily_goal_table",
            sql: include_str!("../migrations/0003_white_cannonball.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_daily_goal_table",
            sql: include_str!("../migrations/0004_boring_masked_marvel.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_daily_goal_table",
            sql: include_str!("../migrations/0006_tough_warbound.sql"),
            kind: MigrationKind::Up,
        },
    ];
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ketav-local.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
