// translator-widget.js - Complete Translation Widget
// Add this single file to your server and include it on all pages

(function() {
    'use strict';
    
    // ⚠️ REPLACE WITH YOUR ACTUAL AZURE CREDENTIALS
    const CONFIG = {
        subscriptionKey: '1k3Fquetlupe6XV0IeUx1BrXj1xR9glYuo9TZJvrz7pHN7eSJNnfJQQJ99BIACqBBLyXJ3w3AAAbACOGMlWn',
        region: 'southeastasia',
        endpoint: 'https://api.cognitive.microsofttranslator.com'
    };

    // Add CSS styles
    function addStyles() {
        if (document.getElementById('translate-widget-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'translate-widget-styles';
        style.textContent = `
            #translate-widget {
    position: fixed;
    top: 100px;
    right: 50px;
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

#translate-icon {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); /* chatbot shadow */
    transition: all 0.3s ease;
    border: 3px solid #6366f1;
    background-color: #f3f3f3ff; 
}

#translate-icon img {
    width: 90%;
    height: 90%;
    object-fit: contain;
    border-radius: 50%;
}

#translate-icon:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4); /* chatbot hover shadow */
}

#language-dropdown {
    position: absolute;
    top: 70px;
    right: 0;
    background: white;
    border-radius: 10px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    min-width: 220px;
    display: none;
    overflow: hidden;
    border: 1px solid #ffffffff;
}

#language-dropdown.show {
    display: block;
    animation: slideDown 0.3s ease;
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.dropdown-header {
    padding: 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    font-weight: 600;
    color: #495057;
    text-align: center;
    font-size: 14px;
}

.language-list {
    max-height: 300px;
    overflow-y: auto;
}

.language-option {
    padding: 12px 15px;
    cursor: pointer;
    transition: background-color 0.2s;
    border-bottom: 1px solid #f1f3f4;
    font-size: 14px;
    color: #333;
    display: flex;
    align-items: center;
}

.language-option:hover {
    background: #f8f9ff;
    color: #667eea;
}

.language-option:last-child {
    border-bottom: none;
}

.flag {
    margin-right: 10px;
    font-size: 16px;
}

.reset-option {
    background: #1681ecff;
    font-weight: 600;
    color: #667eea;
    border-top: 2px solid #1483f3ff;
}

.reset-option:hover {
    background: #e3f2fd;
}

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: none;
    z-index: 9999;
    align-items: center;
    justify-content: center;
}

.loading-content {
    background: white;
    padding: 30px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
    #translate-widget {
        top: 15px;
        right: 15px;
    }
    #translate-icon {
        width: 50px;
        height: 50px;
        font-size: 20px;
    }
    #language-dropdown {
        min-width: 200px;
        right: -10px;
    }
}

        `;
        document.head.appendChild(style);
    }

    // Add HTML structure
    function addHTML() {
        if (document.getElementById('translate-widget')) return;
        
        const widgetHTML = `
            <div id="translate-widget">
                <button id="translate-icon" title="Translate Page">
  <img src="../assets/images/translateb.png" alt="Translate" ;">
</button>

                
                <div id="language-dropdown">
                    <div class="dropdown-header">Choose Language</div>
                    <div class="language-list">
                        <div class="language-option" data-lang="es">
                            <span class="flag">🇪🇸</span>Spanish
                        </div>
                        <div class="language-option" data-lang="fr">
                            <span class="flag">🇫🇷</span>French
                        </div>
                        <div class="language-option" data-lang="de">
                            <span class="flag">🇩🇪</span>German
                        </div>
                        <div class="language-option" data-lang="it">
                            <span class="flag">🇮🇹</span>Italian
                        </div>
                        <div class="language-option" data-lang="pt">
                            <span class="flag">🇵🇹</span>Portuguese
                        </div>
                        <div class="language-option" data-lang="ru">
                            <span class="flag">🇷🇺</span>Russian
                        </div>
                        <div class="language-option" data-lang="ja">
                            <span class="flag">🇯🇵</span>Japanese
                        </div>
                        <div class="language-option" data-lang="ko">
                            <span class="flag">🇰🇷</span>Korean
                        </div>
                        <div class="language-option" data-lang="zh">
                            <span class="flag">🇨🇳</span>Chinese
                        </div>
                        <div class="language-option" data-lang="hi">
                            <span class="flag">🇮🇳</span>Hindi
                        </div>
                        <div class="language-option" data-lang="ar">
                            <span class="flag">🇸🇦</span>Arabic
                        </div>
                        <div class="language-option" data-lang="doi">
                            <span class="flag">🇮🇳</span>Dogri
                        </div>
                        <div class="language-option" data-lang="ks">
                            <span class="flag">🇮🇳</span>Kashmiri
                        </div>
                        <div class="language-option reset-option" data-lang="reset">
                            <span class="flag">🔄</span>Reset to Original
                        </div>
                    </div>
                </div>
            </div>

            <div class="loading-overlay" id="loading-overlay">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p>Translating content...</p>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    // Translation functionality
    class PageTranslator {
        constructor() {
            this.subscriptionKey = CONFIG.subscriptionKey;
            this.region = CONFIG.region;
            this.endpoint = CONFIG.endpoint;
            
            this.originalContent = new Map();
            this.currentLang = 'original';
            this.isTranslating = false;
            
            this.init();
        }
        
        init() {
            this.bindEvents();
            this.storeOriginalContent();
        }
        
        bindEvents() {
            const translateIcon = document.getElementById('translate-icon');
            const dropdown = document.getElementById('language-dropdown');
            const languageOptions = document.querySelectorAll('.language-option');
            
            translateIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });
            
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && e.target !== translateIcon) {
                    dropdown.classList.remove('show');
                }
            });
            
            languageOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    const selectedLang = e.currentTarget.dataset.lang;
                    dropdown.classList.remove('show');
                    
                    if (selectedLang === 'reset') {
                        this.resetToOriginal();
                    } else {
                        this.translatePage(selectedLang);
                    }
                });
            });
        }
        
        storeOriginalContent() {
            const textNodes = this.getAllTextNodes(document.body);
            textNodes.forEach((node, index) => {
                if (node.textContent.trim()) {
                    this.originalContent.set(node, node.textContent);
                }
            });
        }
        
        getAllTextNodes(element) {
            const textNodes = [];
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;
                        
                        const tagName = parent.tagName.toLowerCase();
                        const skipTags = ['script', 'style', 'noscript'];
                        const skipIds = ['translate-widget', 'loading-overlay'];
                        
                        if (skipTags.includes(tagName) || 
                            skipIds.some(id => parent.closest(`#${id}`))) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        
                        return node.textContent.trim() ? 
                               NodeFilter.FILTER_ACCEPT : 
                               NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            
            return textNodes;
        }
        
        async translatePage(targetLang) {
            if (this.isTranslating) return;
            
            if (this.subscriptionKey === 'paste-your-key-1-or-key-2-here') {
                alert('Please add your Azure subscription key to enable translation.');
                return;
            }
            
            this.isTranslating = true;
            this.showLoading(true);
            
            try {
                const textNodes = Array.from(this.originalContent.keys());
                const textsToTranslate = textNodes.map(node => this.originalContent.get(node));
                
                const translations = await this.translateTexts(textsToTranslate, targetLang);
                
                textNodes.forEach((node, index) => {
                    if (translations[index]) {
                        node.textContent = translations[index];
                    }
                });
                
                this.currentLang = targetLang;
                
            } catch (error) {
                console.error('Translation failed:', error);
                alert('Translation failed. Please check your API credentials and try again.');
            } finally {
                this.isTranslating = false;
                this.showLoading(false);
            }
        }
        
        async translateTexts(texts, targetLang) {
            const body = texts.map(text => ({ text: text }));
            const url = `${this.endpoint}/translate?api-version=3.0&to=${targetLang}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                    'Ocp-Apim-Subscription-Region': this.region,
                    'Content-Type': 'application/json',
                    'X-ClientTraceId': this.generateUUID()
                },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }
            
            const results = await response.json();
            return results.map(result => 
                result.translations && result.translations[0] ? 
                result.translations[0].text : null
            );
        }
        
        resetToOriginal() {
            this.originalContent.forEach((originalText, node) => {
                node.textContent = originalText;
            });
            this.currentLang = 'original';
        }
        
        showLoading(show) {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.style.display = show ? 'flex' : 'none';
            }
        }
        
        generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    // Initialize the widget
    function initWidget() {
        addStyles();
        addHTML();
        new PageTranslator();
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }

})();