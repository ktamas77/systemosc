import Cocoa

// SystemOSC Menu Bar App
// Polls the SystemOSC HTTP API and displays CPU usage in the macOS menu bar.
// Requires HTTP_ENABLED=true in the SystemOSC .env configuration.

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!
    var timer: Timer?
    var httpPort: Int

    override init() {
        // Read port from environment or default to 3000
        if let portStr = ProcessInfo.processInfo.environment["HTTP_PORT"],
           let port = Int(portStr) {
            self.httpPort = port
        } else {
            self.httpPort = 3000
        }
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.title = "CPU --"
        statusItem.button?.font = NSFont.monospacedSystemFont(ofSize: 12, weight: .medium)

        buildMenu(cores: [], total: nil)
        startPolling()
    }

    func startPolling() {
        // Poll every 5 seconds
        timer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.fetchStats()
        }
        // Also fetch immediately
        fetchStats()
    }

    func fetchStats() {
        guard let url = URL(string: "http://localhost:\(httpPort)/") else { return }

        let task = URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self else { return }

            if let error = error {
                DispatchQueue.main.async {
                    self.statusItem.button?.title = "CPU ?"
                    self.statusItem.button?.contentTintColor = .systemGray
                    self.buildMenu(cores: [], total: nil, error: error.localizedDescription)
                }
                return
            }

            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                DispatchQueue.main.async {
                    self.statusItem.button?.title = "CPU ?"
                    self.statusItem.button?.contentTintColor = .systemGray
                }
                return
            }

            var total: Double?
            var cores: [(Int, Double)] = []

            for item in json {
                guard let name = item["name"] as? String else { continue }

                if name == "/cpu/usage/total", let val = item["value"] as? Double {
                    total = val
                } else if name.hasPrefix("/cpu/core/") && name.hasSuffix("/load"),
                          let val = item["value"] as? Double {
                    let parts = name.split(separator: "/")
                    if parts.count >= 4, let coreNum = Int(parts[2]) {
                        cores.append((coreNum, val))
                    }
                }
            }

            cores.sort { $0.0 < $1.0 }

            DispatchQueue.main.async {
                if let total = total {
                    let pct = Int(total.rounded())
                    self.statusItem.button?.title = "CPU \(pct)%"

                    if total >= 80 {
                        self.statusItem.button?.contentTintColor = .systemRed
                    } else if total >= 50 {
                        self.statusItem.button?.contentTintColor = .systemOrange
                    } else {
                        self.statusItem.button?.contentTintColor = .systemGreen
                    }
                } else {
                    self.statusItem.button?.title = "CPU --"
                    self.statusItem.button?.contentTintColor = .systemGray
                }

                self.buildMenu(cores: cores, total: total)
            }
        }
        task.resume()
    }

    func buildMenu(cores: [(Int, Double)], total: Double?, error: String? = nil) {
        let menu = NSMenu()

        if let total = total {
            let header = NSMenuItem(title: "Total CPU: \(String(format: "%.1f", total))%", action: nil, keyEquivalent: "")
            header.isEnabled = false
            menu.addItem(header)
            menu.addItem(NSMenuItem.separator())
        }

        if !cores.isEmpty {
            let coresHeader = NSMenuItem(title: "Per-Core Load", action: nil, keyEquivalent: "")
            coresHeader.isEnabled = false
            menu.addItem(coresHeader)

            for (core, load) in cores {
                let bar = makeBar(load)
                let item = NSMenuItem(title: "  Core \(core): \(bar) \(String(format: "%.0f", load))%", action: nil, keyEquivalent: "")
                item.isEnabled = false
                menu.addItem(item)
            }
            menu.addItem(NSMenuItem.separator())
        }

        if let error = error {
            let errItem = NSMenuItem(title: "Error: \(error)", action: nil, keyEquivalent: "")
            errItem.isEnabled = false
            menu.addItem(errItem)
            menu.addItem(NSMenuItem.separator())
        }

        menu.addItem(NSMenuItem(title: "View Logs...", action: #selector(viewLogs), keyEquivalent: "l"))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Quit SystemOSC Menu", action: #selector(quitApp), keyEquivalent: "q"))

        statusItem.menu = menu
    }

    func makeBar(_ value: Double) -> String {
        let filled = Int((value / 100.0) * 10)
        let empty = 10 - filled
        return "[" + String(repeating: "|", count: filled) + String(repeating: " ", count: empty) + "]"
    }

    @objc func viewLogs() {
        let logPath = NSString(string: "~/Library/Logs/systemosc.log").expandingTildeInPath
        NSWorkspace.shared.open(URL(fileURLWithPath: logPath))
    }

    @objc func quitApp() {
        NSApplication.shared.terminate(nil)
    }
}

// Main entry point
let app = NSApplication.shared
app.setActivationPolicy(.accessory) // No Dock icon (LSUIElement equivalent)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
