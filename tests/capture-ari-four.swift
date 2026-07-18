import AppKit
import Foundation
import WebKit

final class CaptureARI: NSObject, WKNavigationDelegate {
    private let webView: WKWebView
    private let baseURL: URL
    private let outputURL: URL
    private var bootstrapped = false
    private var measurements: [String: Measurement] = [:]

    init(webView: WKWebView, baseURL: URL, outputURL: URL) {
        self.webView = webView
        self.baseURL = baseURL
        self.outputURL = outputURL
    }

    func start() {
        webView.navigationDelegate = self
        webView.load(URLRequest(url: baseURL.appendingPathComponent("index.html"), cachePolicy: .reloadIgnoringLocalAndRemoteCacheData))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if !bootstrapped {
            bootstrapped = true
            let login = """
            localStorage.setItem('sp33_profiles', JSON.stringify([{name:'capture-ari', pin:'0000'}]));
            localStorage.setItem('sp33_current', 'capture-ari');
            location.hash = '#/module/arico';
            """
            webView.evaluateJavaScript(login) { _, error in
                if let error { self.fail("Initialisation : \(error)") }
                else { DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { self.prepare() } }
            }
        }
    }

    private func prepare() {
        let script = """
        (() => {
          const grid = document.querySelector('.keypoints-visual');
          const cards = [...document.querySelectorAll('.visual-keypoint[data-module="arico"]')];
          if (!grid || cards.length < 6) return null;
          const keep = new Set(['0', '3', '4', '5']);
          cards.forEach(card => { card.style.display = keep.has(card.dataset.keypointIndex) ? '' : 'none'; });
          document.querySelector('.sidebar')?.style.setProperty('display', 'none');
          document.querySelector('.topbar')?.style.setProperty('display', 'none');
          document.querySelector('.app-main')?.style.setProperty('margin-left', '0');
          document.querySelector('main')?.style.setProperty('max-width', '1280px');
          grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
          grid.style.gap = '18px';
          const kept = cards.filter(card => keep.has(card.dataset.keypointIndex));
          kept.forEach(card => {
            card.style.gridColumn = 'span 1';
            card.style.minHeight = '390px';
          });
          grid.scrollIntoView({block:'start'});
          const rect = grid.getBoundingClientRect();
          const selectors = {
            '0': '.ari-primary-object, .inc-bottle',
            '3': '.ari-primary-object, .inc-regulator',
            '4': '.ari-primary-object, .inc-regulator',
            '5': '.ari-primary-object, .inc-mask'
          };
          const measurements = {};
          kept.forEach(card => {
            const object = card.querySelector(selectors[card.dataset.keypointIndex]);
            if (!object) return;
            const box = object.getBoundingClientRect();
            measurements[card.dataset.keypointIndex] = {width:box.width, height:box.height};
          });
          return JSON.stringify({x:rect.x, y:rect.y, width:rect.width, height:rect.height, measurements});
        })()
        """
        webView.evaluateJavaScript(script) { value, error in
            if let error { self.fail("Préparation : \(error)"); return }
            guard let json = value as? String,
                  let data = json.data(using: .utf8),
                  let rect = try? JSONDecoder().decode(Rect.self, from: data) else {
                self.fail("Cartes ARI introuvables")
                return
            }
            self.measurements = rect.measurements
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { self.snapshot(rect) }
        }
    }

    private func snapshot(_ rect: Rect) {
        let configuration = WKSnapshotConfiguration()
        configuration.rect = CGRect(x: rect.x, y: max(0, rect.y), width: rect.width, height: min(rect.height, 1320))
        configuration.snapshotWidth = NSNumber(value: rect.width * 1.5)
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
                for key in ["0", "3", "4", "5"] {
                    if let value = self.measurements[key] {
                        print("index \(key): \(Int(value.width.rounded())) × \(Int(value.height.rounded())) px")
                    }
                }
                fflush(stdout)
                exit(0)
            } catch { self.fail("Écriture : \(error)") }
        }
    }

    private func fail(_ message: String) {
        fputs("ÉCHEC CAPTURE : \(message)\n", stderr)
        fflush(stderr)
        exit(1)
    }
}

private struct Rect: Decodable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    let measurements: [String: Measurement]
}

private struct Measurement: Decodable {
    let width: Double
    let height: Double
}

let baseURL = URL(string: CommandLine.arguments.dropFirst().first ?? "http://127.0.0.1:8765/")!
let outputURL = URL(fileURLWithPath: CommandLine.arguments.dropFirst(2).first ?? "/tmp/ari-four.png")
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let configuration = WKWebViewConfiguration()
configuration.websiteDataStore = .nonPersistent()
let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 1440, height: 1500), configuration: configuration)
let window = NSWindow(contentRect: webView.frame, styleMask: [.borderless], backing: .buffered, defer: false)
window.contentView = webView
window.orderFront(nil)
let capture = CaptureARI(webView: webView, baseURL: baseURL, outputURL: outputURL)
capture.start()
app.run()
