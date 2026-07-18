import AppKit
import Foundation
import WebKit

final class ModuleCapture: NSObject, WKNavigationDelegate {
    private let webView: WKWebView
    private let baseURL: URL
    private let module: String
    private let outputURL: URL
    private var bootstrapped = false

    init(webView: WKWebView, baseURL: URL, module: String, outputURL: URL) {
        self.webView = webView
        self.baseURL = baseURL
        self.module = module
        self.outputURL = outputURL
    }

    func start() {
        webView.navigationDelegate = self
        webView.load(URLRequest(url: baseURL.appendingPathComponent("index.html"), cachePolicy: .reloadIgnoringLocalAndRemoteCacheData))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard !bootstrapped else { return }
        bootstrapped = true
        let script = """
        localStorage.setItem('sp33_profiles', JSON.stringify([{name:'capture-module', pin:'0000'}]));
        localStorage.setItem('sp33_current', 'capture-module');
        location.hash = '#/module/\(module)';
        """
        webView.evaluateJavaScript(script) { _, error in
            if let error { self.fail("Initialisation : \(error)") }
            else { DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { self.prepare() } }
        }
    }

    private func prepare() {
        let script = """
        (() => {
          const grid = document.querySelector('.keypoints-visual');
          const cards = [...document.querySelectorAll('.visual-keypoint[data-module="\(module)"]')];
          if (!grid || !cards.length) return null;
          document.querySelector('.sidebar')?.style.setProperty('display', 'none');
          document.querySelector('.topbar')?.style.setProperty('display', 'none');
          document.querySelector('.app-main')?.style.setProperty('margin-left', '0');
          document.querySelector('main')?.style.setProperty('max-width', '1280px');
          grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
          grid.style.gap = '18px';
          cards.forEach(card => { card.style.gridColumn = 'span 1'; card.style.minHeight = '390px'; });
          grid.scrollIntoView({block:'start'});
          const rect = grid.getBoundingClientRect();
          const illustrated = cards.filter(card => card.querySelector('.inc-illustrated, .ari-special')).length;
          return JSON.stringify({x:rect.x, y:rect.y, width:rect.width, height:rect.height, cards:cards.length, illustrated});
        })()
        """
        webView.evaluateJavaScript(script) { value, error in
            if let error { self.fail("Préparation : \(error)"); return }
            guard let json = value as? String,
                  let data = json.data(using: .utf8),
                  let rect = try? JSONDecoder().decode(Rect.self, from: data) else {
                self.fail("Module introuvable")
                return
            }
            guard rect.cards == rect.illustrated else {
                self.fail("\(rect.illustrated)/\(rect.cards) cartes illustrées")
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { self.snapshot(rect) }
        }
    }

    private func snapshot(_ rect: Rect) {
        let configuration = WKSnapshotConfiguration()
        configuration.rect = CGRect(x: rect.x, y: max(0, rect.y), width: rect.width, height: rect.height)
        configuration.snapshotWidth = NSNumber(value: rect.width * 1.25)
        webView.takeSnapshot(with: configuration) { image, error in
            if let error { self.fail("Capture : \(error)"); return }
            guard let image,
                  let tiff = image.tiffRepresentation,
                  let bitmap = NSBitmapImageRep(data: tiff),
                  let png = bitmap.representation(using: .png, properties: [:]) else {
                self.fail("Encodage PNG impossible")
                return
            }
            do {
                try png.write(to: self.outputURL)
                print(self.outputURL.path)
                fflush(stdout)
                exit(0)
            } catch { self.fail("Écriture : \(error)") }
        }
    }

    private func fail(_ message: String) {
        fputs("ÉCHEC CAPTURE \(module) : \(message)\n", stderr)
        fflush(stderr)
        exit(1)
    }
}

private struct Rect: Decodable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    let cards: Int
    let illustrated: Int
}

let args = Array(CommandLine.arguments.dropFirst())
let baseURL = URL(string: args.first ?? "http://127.0.0.1:8765/")!
let module = args.count > 1 ? args[1] : "systeme-feu"
let outputURL = URL(fileURLWithPath: args.count > 2 ? args[2] : "/tmp/\(module).png")
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let configuration = WKWebViewConfiguration()
configuration.websiteDataStore = .nonPersistent()
let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 1440, height: 4300), configuration: configuration)
let window = NSWindow(contentRect: webView.frame, styleMask: [.borderless], backing: .buffered, defer: false)
window.contentView = webView
window.orderFront(nil)
let capture = ModuleCapture(webView: webView, baseURL: baseURL, module: module, outputURL: outputURL)
capture.start()
app.run()
