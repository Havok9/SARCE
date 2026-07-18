import AppKit
import Darwin
import Foundation
import WebKit

struct CourseData: Decodable { let modules: [CourseModule] }
struct CourseModule: Decodable {
    let id: String
    let domain: String
    let keypoints: [Keypoint]?
}
struct Keypoint: Decodable {}

struct DomResult: Decodable {
    let module: String
    let expected: Int
    let articles: Int
    let svg: Int
    let visible: Int
    let empty: Int
    let fallbacks: Int
    let uniqueKeys: Int
    let missingComposition: Int
    let oldLinear: Int
    let compositions: [String]
    let loadedApp: String
}

final class DomAudit: NSObject, WKNavigationDelegate {
    private let webView: WKWebView
    private let baseURL: URL
    private let targets: [CourseModule]
    private var index = -1
    private var results: [DomResult] = []
    private var pollCount = 0

    init(webView: WKWebView, baseURL: URL, targets: [CourseModule]) {
        self.webView = webView
        self.baseURL = baseURL
        self.targets = targets
    }

    func start() {
        webView.navigationDelegate = self
        webView.load(URLRequest(url: baseURL.appendingPathComponent("index.html")))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if index == -1 {
            let login = """
            localStorage.setItem('sp33_profiles', JSON.stringify([{name:'dom-audit', pin:'0000'}]));
            localStorage.setItem('sp33_current', 'dom-audit');
            """
            webView.evaluateJavaScript(login) { _, error in
                if let error { self.fail("Initialisation du profil : \(error)") }
                else { self.openNext() }
            }
        } else {
            pollCount = 0
            pollCurrentModule()
        }
    }

    private func openNext() {
        index += 1
        guard index < targets.count else { finish() ; return }
        let target = targets[index]
        if index > 0 {
            pollCount = 0
            webView.evaluateJavaScript("location.hash = '#/module/\(target.id)'") { _, error in
                if let error { self.fail("Navigation SPA \(target.id) : \(error)"); return }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { self.pollCurrentModule() }
            }
            return
        }
        var parts = URLComponents(url: baseURL.appendingPathComponent("index.html"), resolvingAgainstBaseURL: false)!
        parts.queryItems = [URLQueryItem(name: "dom-audit", value: "20260718")]
        parts.fragment = "/module/\(target.id)"
        webView.load(URLRequest(url: parts.url!, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData))
    }

    private func pollCurrentModule() {
        let target = targets[index]
        let expected = target.keypoints?.count ?? 0
        let script = """
        (() => {
          const body = document.querySelector('#mod-body');
          if (!body || body.dataset.renderedModule !== '\(target.id)') return null;
          const cards = [...document.querySelectorAll('.visual-keypoint[data-domain="incendie"][data-module="\(target.id)"]')];
          const visible = cards.filter(card => {
            const scene = card.querySelector('.visual-keypoint-scene');
            const svg = scene && scene.querySelector('svg');
            if (!scene || !svg) return false;
            const style = getComputedStyle(scene), svgStyle = getComputedStyle(svg);
            const rect = svg.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 &&
                   svgStyle.display !== 'none' && svgStyle.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          }).length;
          return JSON.stringify({
            module: '\(target.id)', expected: \(expected), articles: cards.length,
            svg: cards.filter(card => card.querySelector('.visual-keypoint-scene svg')).length,
            visible,
            empty: cards.filter(card => !card.querySelector('.visual-keypoint-scene')?.children.length).length,
            fallbacks: cards.filter(card => card.classList.contains('kp-type-default')).length,
            uniqueKeys: new Set(cards.map(card => card.dataset.sceneKey)).size,
            missingComposition: cards.filter(card => !card.querySelector('[data-composition]')).length,
            oldLinear: cards.filter(card => card.querySelector('.inc-baseline')).length,
            compositions: [...new Set(cards.map(card => card.querySelector('[data-composition]')?.dataset.composition).filter(Boolean))].sort(),
            loadedApp: document.querySelector('script[src*="js/app.js"]')?.src || ''
          });
        })()
        """
        webView.evaluateJavaScript(script) { value, error in
            if let error { self.fail("\(target.id) : \(error)"); return }
            guard let json = value as? String else {
                self.pollCount += 1
                if self.pollCount > 80 { self.fail("\(target.id) : délai de rendu dépassé"); return }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { self.pollCurrentModule() }
                return
            }
            do {
                let result = try JSONDecoder().decode(DomResult.self, from: Data(json.utf8))
                let ok = result.expected == result.articles && result.expected == result.svg &&
                         result.expected == result.visible && result.empty == 0 &&
                         result.fallbacks == 0 && result.uniqueKeys == result.expected &&
                         result.missingComposition == 0 && result.oldLinear == 0 &&
                         result.loadedApp.contains("v=20260718-incendie-illustrated")
                print(String(format: "%-16s %3d attendus · %3d DOM · %3d SVG visibles · %2d compositions · %@",
                             (result.module as NSString).utf8String!, result.expected, result.articles,
                             result.visible, result.compositions.count, ok ? "OK" : "ÉCHEC"))
                fflush(stdout)
                if !ok { self.fail("Écart DOM sur \(result.module)"); return }
                self.results.append(result)
                self.openNext()
            } catch { self.fail("Décodage \(target.id) : \(error)") }
        }
    }

    private func finish() {
        let expected = results.reduce(0) { $0 + $1.expected }
        let rendered = results.reduce(0) { $0 + $1.articles }
        let compositions = Set(results.flatMap(\.compositions))
        guard compositions.count >= 10 else {
            fail("Variété insuffisante : \(compositions.count) compositions")
            return
        }
        print("TOTAL            \(expected) attendus · \(rendered) visual-keypoint rendus · \(compositions.count) compositions · OK")
        fflush(stdout)
        exit(0)
    }

    private func fail(_ message: String) {
        fputs("ÉCHEC DOM : \(message)\n", stderr)
        fflush(stderr)
        exit(1)
    }
}

let base = URL(string: CommandLine.arguments.dropFirst().first ?? "http://127.0.0.1:8765/")!
let modulesURL = base.appendingPathComponent("data/modules.json")
let data = try Data(contentsOf: modulesURL)
let course = try JSONDecoder().decode(CourseData.self, from: data)
let targets = course.modules.filter { $0.domain == "incendie" }
print("Audit WebKit réel : \(targets.count) modules chargés depuis modules.json")
fflush(stdout)

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let configuration = WKWebViewConfiguration()
configuration.websiteDataStore = .nonPersistent()
let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 1365, height: 900), configuration: configuration)
let window = NSWindow(contentRect: webView.frame, styleMask: [.borderless], backing: .buffered, defer: false)
window.contentView = webView
window.orderFront(nil)
let audit = DomAudit(webView: webView, baseURL: base, targets: targets)
audit.start()
app.run()
