(function() {
    var figmaPlus = window.figmaPlus,
        figma = window.figma,
        app = window.App,
        plugin = {
            title: plugin-manifest.name,
            version: plugin-manifest.version,
            load: {
                scripts: [
                    {
                        src: 'https://code.iconify.design/1/1.0.2/iconify.min.js',
                        test: function() {
                            return window.Iconify !== void 0;
                        }
                    },
                    'https://code.iconify.design/samples.js',
                    'https://code.iconify.design/search/1/1.0.3/search.min.js'
                ],
                stylesheets: [
                    'https://fonts.googleapis.com/css?family=PT+Sans',
                    'https://code.iconify.design/search/1/1.0.3/style.css'
                ],
                styles: [
                    plugin-src.style.css
                ]
            },
            options: {

            }
        },
        loading = false,
        loaded = false,
        lastId = null,
        lastParent = null;

    /**
     * Call done() after test() is successful
     *
     * @param {function} test
     * @param {function} done
     */
    function delay(test, done) {
        var counter = 0,
            timer, result;

        function nextTick() {
            result = test();

            if (result) {
                // Success
                window.clearInterval(timer);
                done();
                return;
            }

            if (result === null) {
                // Stop execution
                window.clearInterval(timer);
                return;
            }

            // Test failed
            counter ++;
            if (counter === 10 || counter === 25) {
                // It takes too long. Reduce timeout
                window.clearInterval(timer);
                timer = window.setInterval(nextTick, counter === 10 ? 250 : 1000);
            }
        }

        // Do first test immediately
        result = test();
        if (result) {
            done();
            return;
        }
        if (result === null) {
            return;
        }

        // Create timer
        timer = window.setInterval(nextTick, 100);
    }

    /**
     * Test if all dependencies have loaded
     */
    function testDependencies() {
        return window.Iconify !== void 0 && window.IconifySearch !== void 0;
    }

    /**
     * Load all dependencies, call done() when done
     *
     * @param {function} done
     */
    function loadDependencies(done) {
        var scripts, style, el;

        function loadNextScript() {
            var item = scripts.shift(),
                src, el, test;

            if (item === void 0) {
                // Loaded all scripts
                console.log('Iconify debug: loaded all scripts, testing all dependencies...');
                delay(testDependencies, function() {
                    console.log('Iconify debug: tested all dependencies, calling done()');
                    loaded = true;
                    loading = false;
                    done();
                });
                return;
            }

            // Load script
            if (typeof item === 'string') {
                src = item;
            } else {
                src = item.src;
                test = item.test;
            }

            el = document.createElement('script');
            el.setAttribute('src', src);
            el.setAttribute('async', true);
            console.log('Iconify: loading script:', src);
            document.head.appendChild(el);

            // Wait for script to load
            if (typeof test !== 'function') {
                loadNextScript();
                return;
            }

            // Create timer to test
            delay(test, loadNextScript);
        }

        if (loaded) {
            done();
            return;
        }

        if (loading) {
            delay(testDependencies, done);
            return;
        }

        loading = true;

        // Load stylesheets
        plugin.load.stylesheets.forEach(function(src) {
            el = document.createElement('link');
            console.log('Iconify: loading stylesheet:', src);
            el.setAttribute('rel', 'stylesheet');
            el.setAttribute('type', 'text/css');
            el.setAttribute('href', src);
            document.head.appendChild(el);
        });

        // Merge custom styles
        style = plugin.load.styles.join('');
        el = document.createElement('style');
        el.setAttribute('type', 'text/css');
        el.innerText = style;
        document.head.appendChild(el);

        // Start loading scripts
        scripts = plugin.load.scripts.slice(0);
        loadNextScript();
    }

    /**
     * Close window
     */
    function closeWindow() {
        figmaPlus.hideUI(plugin.title);
    }

    /**
     * Open new window
     */
    function openWindow() {
        var id = 'iconify-figma-' + Date.now();

        lastId = id;

        // Show "Loading" window
        figmaPlus.showUI({
            title: plugin.title,
            html: '<div id="' + id + '" style="padding: 64px 32px; text-align: center;">Loading...</div>',
            width: 800,
            height: 800,
            padding: false
        });

        // Load dependencies
        loadDependencies(function() {
            if (lastId !== id) {
                return;
            }
            delay(function() {
                // Test if window has loaded
                if (lastId !== id) {
                    // Stop loading
                    return true;
                }
                return document.getElementById(id) !== null;
            }, function() {
                var container;

                // Window has loaded. Replace content
                if (lastId !== id) {
                    return;
                }

                container = document.getElementById(id);
                if (!container) {
                    return;
                }
                loadedWindow(container);
            });
        });
    }

    /**
     * Loaded window. Replace contents
     *
     * @param {Element} container
     */
    function loadedWindow(container) {
        var node;

        // Remove style
        container.setAttribute('style', '');

        // Replace modal-content class with iconify-modal-content in parent node because
        // modal-content includes styles for child nodes that break layout
        // Also add iconify-modal to parent node
        node = container.parentNode;
        while (node = node.parentNode) {
            if (node && node.classList && node.classList.contains('modal-content')) {
                node.classList.remove('modal-content');
                node.classList.add('iconify-modal-content');

                node = node.parentNode;
                if (node && node.classList) {
                    node.classList.add('iconify-modal');
                }
                break;
            }
        }

        // Create icon finder
        window.IconifySearch.create(container, {
            // prefix: 'mdi',
            // hidePrefix: true,
            listView: false,
            append: false,
            show: true,
            useForm: true,
            showCollections: true,
            footer: {
                submit: 'Add Icon',
                submit2: 'Add and Close',
                close: 'Close',
                transform: true,
                size: true,
                hideEmpty: true,
                color: typeof plugin.options.color === 'string' && plugin.options.color.length ? plugin.options.color : true,
                defaultColor: '#000'
            },
            callback: function(event, icon) {
                switch (event) {
                    case 'cancel':
                        closeWindow();
                        return;

                    case 'submit':
                        addIcon(icon);
                        return;

                    case 'submit2':
                        addIcon(icon);
                        closeWindow();
                }
            }
        });

        setTimeout(function() {
            var node = container.querySelector('.is-search-form input');
            if (node) {
                node.focus();
            }
        }, 100);
    }

    /**
     * Add icon
     *
     * @param {object} icon
     */
    function addIcon(icon) {
        var svg = generateSVG(icon),
            node, parent, x, y;

        if (svg === null) {
            return;
        }

        // Add node
        console.log('Iconify: importing SVG:', svg);
        node = figma.createNodeFromSvg(svg);
        if (!node) {
            return;
        }

        // Change name
        console.log('Iconify debug: changing name and saving last node as icLastNode');
        node.name = icon.prefix + (icon.prefix.indexOf('-') === -1 ? '-' : ':') + icon.name;
        window.icLastNode = node;

        // Move it to currently selected item
        if (!figma.currentPage) {
            return;
        }

        parent = null;
        if (figma.currentPage.selection.length) {
            parent = figma.currentPage.selection[0];
            switch (parent.type) {
                case 'GROUP':
                case 'PAGE':
                    break;

                default:
                    parent = parent.parent;
            }
        }

        // Move icon to middle of selected group
        console.log('Iconify debug: moving icon to middle of selected group');
        if (parent && parent.type !== 'PAGE' && parent !== node.parent) {
            if (!lastParent || lastParent.node !== parent) {
                lastParent = {
                    node: parent,
                    offset: 0
                };
            }

            // Move to top left corner
            node.x = parent ? parent.x : 0;
            node.y = parent ? parent.y : 0;

            if (parent.width > node.width) {
                x = Math.floor(parent.width / 2 - node.width);
                x += lastParent.offset;
                node.x += x;
                lastParent.offset += node.width;
            }

            // Change parent node
            console.log('Iconify debug: changing parent node');
            parent.insertChild(parent.children.length, node);
        }

        // Select node
        console.log('Iconify debug: changing selection');
        figma.currentPage.selection = [node];
    }

    /**
     * Copy icon to clipboard
     *
     * @param icon
     * @return {boolean}
     */
    function copyIcon(icon) {
        var svg = generateSVG(icon),
            textarea;

        if (svg === null) {
            return false;
        }

        textarea = document.createElement('textarea');
        textarea.value = svg;
        document.body.appendChild(textarea);

        textarea.select();
        document.execCommand('copy');

        document.body.removeChild(textarea);

        return true;
    }

    /**
     * Generate SVG from icon data
     *
     * @param icon
     * @return {string|null}
     */
    function generateSVG(icon) {
        var Iconify = window.Iconify,
            name, data, colorless, width, height, counter, params, code;

        name = icon.prefix + (icon.prefix.indexOf('-') === -1 ? '-' : ':') + icon.name;
        if (!Iconify.iconExists(name)) {
            return null;
        }

        data = Iconify.getIcon(name);
        if (data === null) {
            return null;
        }

        // Check if icon is colorless
        colorless = data.body.indexOf('currentColor') !== -1;

        // Scale icon
        width = data.width;
        height = data.height;
        counter = 0;
        while (true) {
            counter ++;
            if (counter > 8) {
                break;
            }
            if (height > 47 && width % 2 === 0 && height % 2 === 0) {
                width = width / 2;
                height = height / 2;
                continue;
            }
            if (height > 74 && width % 5 === 0 && height % 5 === 0) {
                width = width / 5;
                height = height / 5;
                break;
            }
            break;
        }

        // Generate SVG code
        // console.log('Data:', data);
        // console.log('Original size:', data.width, data.height, 'Scaled:', width, height);
        params = {
            'data-width': width,
            'data-height': height,
            'data-rotate': icon.rotate,
            'data-flip': (icon.hFlip ? (icon.vFlip ? 'horizontal,vertical' : 'horizontal') : (icon.vFlip ? 'vertical' : ''))
        };
        code = Iconify.getSVG(name, params);
        if (code === null) {
            return null;
        }

        // Replace color
        if (colorless) {
            code = code.replace(/currentColor/g, typeof icon.color === 'string' && icon.color.length ? icon.color : '#000');
        }

        return code;
    }

    /**
     * Add item to FigmaPlus menu
     */
    figmaPlus.addCommand({
        label: plugin.title,
        action: function() {
            closeWindow();
            window.setTimeout(function() {
                window.setTimeout(openWindow, 0);
            }, 0);
        },
        shortcut: {
            mac: {
                option: true,
                shift: true,
                key: 'i'
            },
            windows: {
                alt: true,
                shift: true,
                key: 'i'
            }
        }
    });

})();
