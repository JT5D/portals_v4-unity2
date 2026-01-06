// https://web.dev/articles/lcp
export var LCP;
(function (LCP) {
    function observe() {
        const observer = new PerformanceObserver((list) => {
            const perfEntries = list.getEntries();
            const lastEntry = perfEntries[perfEntries.length - 1];
            // Process the latest candidate for largest contentful paint
            console.log('LCP candidate:', lastEntry);
            const el = createElementFromUrl(lastEntry.url);
            if (el)
                document.body.appendChild(el);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
    LCP.observe = observe;
    function createElementFromUrl(str) {
        if (!str)
            return null;
        if (!str.startsWith('data:image/')) {
            return null;
        }
        else if (!str.includes("base64")) {
            return null;
        }
        const img = document.createElement('img');
        img.src = str;
        img.onerror = err => {
            console.error(err);
            img.remove();
        };
        return img;
    }
})(LCP || (LCP = {}));
//# sourceMappingURL=lcp.js.map