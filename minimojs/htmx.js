

    public static void prepareHTML(XHTMLDocument doc, Set<String> boundVars, Map<String, XModalBind> boundModals,
                                   Map<String, List<Map<String, Object>>> componentMap, List<List<Object>> iteratorsList, boolean isModal) {
        try {
            List<XElement> requiredSourceList = doc.getRequiredResourcesList();

            // prepared components
            for (ComponentVO comp : components) {
                buildComponent(comp, doc, componentMap, requiredSourceList, boundVars, boundModals);
            }
            prepareIterators(doc, iteratorsList, isModal);
            prepareLabels(doc);
            XElement recValues = new XElement("xrs", doc);
            recValues.addChildList(requiredSourceList);
            doc.addChild(recValues);
        } catch (Exception e) {
            throw new RuntimeException("Error preparing html file", e);
        }
    }

    static Pattern pattern = Pattern.compile("\\(%(.*?%)\\)");

    private static void prepareLabels(XHTMLDocument html) throws XLabelException {
        html.replaceAllTexts(new XHTMLDocument.TextReplacer() {
            @Override
            public String replace(String text) {
                Matcher matcher = pattern.matcher(text);
                while (matcher.find()) {
                    String val = matcher.group();
                    val = val.substring(2, val.length() - 2);
                    String newVal = XLabels.getLabel(val);
                    text = matcher.replaceAll(newVal);
                    matcher = pattern.matcher(text);
                }
                return text;
            }

        });
    }

    private static synchronized void prepareIterators(XElement mainElement, List<List<Object>> iterators,
                                                      boolean isModal) throws XHTMLParsingException {
        XElement iterEl;
        while ((iterEl = findIterators(mainElement)) != null) {
            String xiterId = generateId();
            boolean isHidden = iterEl.getName().equalsIgnoreCase("xiterator");
            iterEl.setHiddenAttribute("xiterId", xiterId);
            iterEl.setHiddenAttribute("xiteratorStatus", "none");
            iterEl.setHiddenAttribute("xiteratorElement", "true");
            String listOrTimes = iterEl.getAttribute(isHidden ? "list" : "data-xiterator-list");
            boolean isTimes = false;
            if (listOrTimes == null) {
                isTimes = true;
                listOrTimes = iterEl.getAttribute(isHidden ? "count" : "data-xiterator-count");
            }
            if (listOrTimes == null) {
                throw new RuntimeException("Iterator must have a list or a count var");
            }
            List<Object> params = new ArrayList<Object>();
            params.add(xiterId);
            params.add(listOrTimes);
            String var = iterEl.getAttribute(isHidden ? "var" : "data-xiterator-var");
            params.add(var);
            var = iterEl.getAttribute(isHidden ? "indexvar" : "data-xiterator-indexvar");
            params.add(var);
            if (!isModal) {
                removeIteratorAttributes(iterEl);
            }
            iterEl.setTempAttribute("prepared-iterator", true);
            params.add(iterEl.toJson());
            params.add(isTimes);
            iterators.add(params);
            if (!isModal) {
                iterEl.removeAllChildren();
            }
        }
    }

    private static void removeIteratorAttributes(XElement iterEl) {
        if (iterEl.getName().equalsIgnoreCase("xiterator")) {
            iterEl.removeAttributes("indexvar", "var", "list", "count");
        } else {
            for (XAttribute a : iterEl.getAttributes()) {
                if (a.getName().startsWith("data-xiterator-")) {
                    iterEl.removeAttributes(a.getName());
                }
            }
        }
    }

    private static synchronized void buildComponent(ComponentVO comp, XHTMLDocument doc,
                                                    Map<String, List<Map<String, Object>>> components, List<XElement> requiredList, Set<String> boundVars,
                                                    Map<String, XModalBind> boundModals) throws XHTMLParsingException {
        String componentName = comp.varPath;
        XElement element;
        while ((element = findDeepestChild(doc, comp.resourceName.toLowerCase())) != null) {

            // get declared properties in doc tag - config
            Map<String, Object> infoProperties = new HashMap<String, Object>();
            Map<String, String> htmxBoundVars = null;
            if (comp.htmxStyle) {
                htmxBoundVars = childInfoHtmxFormat(componentName, element, infoProperties);
            } else {
                childInfoOldFormat(componentName, element, infoProperties);
            }
            // get declared properties in doc tag - finish

            // generate html
            String newHTML = getHtml(componentName, infoProperties);
            if (infoProperties.containsKey("xid")) {
                newHTML = "<div _s_xid_='" + infoProperties.get("xid") + "'></div>" + newHTML + "<div _e_xid_='"
                        + infoProperties.get("xid") + "'></div>";
            }

            // change mContent
            newHTML = XStringUtil.replaceFirst(newHTML, "{mContent}", "<_temp_x_body/>");

            // parse new html
            XHTMLParser parser = new XHTMLParser();
            XHTMLDocument newDoc = parser.parse(newHTML);
            if (comp.htmxStyle) {
                configBinds(newDoc, htmxBoundVars);
            }
            String id = generateId();
            newDoc.setHiddenAttributeOnChildren("xcompId", id);
            newDoc.setHiddenAttributeOnChildren("xcompName", comp.resourceName);
            infoProperties.put("xcompId", id);
            infoProperties = removeHTML(infoProperties);

            List<XElement> findBody = newDoc.getElementsByName("_temp_x_body");
            if (!findBody.isEmpty()) {
                if (element.getChildren().isEmpty()) {
                    findBody.get(0).remove();
                } else {
                    XNode node = element.getChildren().get(0);
                    findBody.get(0).replaceWith(node);
                    for (int i = 1; i < element.getChildren().size(); i++) {
                        XNode child = element.getChildren().get(i);
                        node.addAfter(child);
                        node = child;
                    }
                }
            }
            if (boundVars != null) {
                if (comp.htmxStyle) {
                    for (String var : htmxBoundVars.values()) {
                        boundVars.add(var.split("\\.")[0]);
                    }
                }
                boundVars.addAll(parser.getBoundObjects());
            }
            if (boundModals != null) {
                boundModals.putAll(parser.getBoundModals());
            }
            requiredList.addAll(newDoc.getRequiredResourcesList());
            List<XNode> list = newDoc.getChildren();
            XNode newNode = list.get(0);
            element.replaceWith(newNode);
            for (int i = 1; i < list.size(); i++) {
                XNode auxNode = list.get(i);
                newNode.addAfter(auxNode);
                newNode = auxNode;
            }
            List<Map<String, Object>> listByComponent = components.get(comp.resourceName);
            if (listByComponent == null) {
                listByComponent = new ArrayList<Map<String, Object>>();
                components.put(comp.resourceName, listByComponent);
            }

            listByComponent.add(infoProperties);
        }
    }

    //replace the values with the configured in the component. ex: <comp b="xx"> with b = types.bind -> <input data-xbind="xx">
    private static void configBinds(XHTMLDocument doc, Map<String, String> htmxBoundVars) {
        List<XElement> elements = doc.getElementsWithAttribute("data-xbind");
        for (XElement e : elements) {
            String val = e.getAttribute("data-xbind");
            if (htmxBoundVars.containsKey(val)) {
                e.setAttribute("data-xbind", htmxBoundVars.get(val));
            }
        }
    }

    private static Map<String, String> childInfoHtmxFormat(String componentName, XElement element, Map<String, Object> infoProperties) {
        Map<String, String> boundVars = new HashMap<String, String>();
        Map<String, Object> definedAttributes = XJS.getDefinedAttributes(componentName);
        prepareDefinedAttributes(element, infoProperties, boundVars, definedAttributes);
        return boundVars;
    }

    private static void prepareDefinedAttributes(XElement element, Map<String, Object> infoProperties, Map<String, String> boundVars, Map<String, Object> definedAttributes) {
        for (Map.Entry<String, Object> entry : definedAttributes.entrySet()) {
            if (entry.getValue() instanceof Map) {
                List<Map<String, Object>> childInfoProperties = new ArrayList<Map<String, Object>>();
                List<XElement> childElements = findAllChildren(element, entry.getKey());
                for (XElement child : childElements) {
                    Map<String, Object> childInfoMap = new HashMap<String, Object>();
                    prepareDefinedAttributes(child, childInfoMap, boundVars, (Map<String, Object>) entry.getValue());
                    child.remove();
                    childInfoProperties.add(childInfoMap);
                }
                infoProperties.put(entry.getKey(), childInfoProperties);
            } else {
                String value = element.getAttribute(entry.getKey());
                AttributeType attType = (AttributeType) entry.getValue();
                if (attType.equals(TYPES.bind) || attType.equals(TYPES.mandatory.bind)) {
                    //bind dont go to client. It is rendered on compile time
                    boundVars.put(entry.getKey(), value);
                } else if (attType.equals(TYPES.innerHTML) || attType.equals(TYPES.mandatory.innerHTML)) {
                    infoProperties.put(entry.getKey(), element.innerHTML());
                } else {
                    //attribute
                    infoProperties.put(entry.getKey(), value);
                }
            }
        }
    }

    private static void childInfoOldFormat(String componentName, XElement element, Map<String, Object> infoProperties) {
        Map<String, Map<String, String>> childInfo = XJS.getChildElementsInfo(componentName);
        for (Map.Entry<String, Map<String, String>> entry : childInfo.entrySet()) {
            List<Map<String, Object>> childInfoProperties = new ArrayList<Map<String, Object>>();
            List<XElement> childElements = findAllChildren(element, entry.getValue().get("from"));
            for (XElement child : childElements) {
                Map<String, Object> childInfoMap = new HashMap<String, Object>();
                childInfoMap.put("innerHTML", child.innerHTML());
                for (XAttribute a : child.getAttributes()) {
                    childInfoMap.put(a.getName(), a.getValue());
                }
                child.remove();
                childInfoProperties.add(childInfoMap);
            }
            infoProperties.put(entry.getKey(), childInfoProperties);
        }
        for (XAttribute a : element.getAttributes()) {
            infoProperties.put(a.getName(), a.getValue());
        }
    }

    private static String getHtml(String componentName, Map<String, Object> infoProperties) {
        if (htmxSources.containsKey(componentName)) {
            return htmxSources.get(componentName);
        }
        return XJS.getHtml(componentName, infoProperties);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> removeHTML(Map<String, Object> infoProperties) {
        Map<String, Object> map = new HashMap<String, Object>();
        for (Map.Entry<String, Object> e : infoProperties.entrySet()) {
            if (!e.getKey().equals("innerHTML")) {
                if (e.getValue() instanceof Map) {
                    map.put(e.getKey(), removeHTML((Map<String, Object>) e.getValue()));
                } else {
                    map.put(e.getKey(), e.getValue());
                }
            }
        }
        return map;
    }

    public static final String generateId() {
        return "i" + (java.lang.System.currentTimeMillis() + (int) (Math.random() * 99999));
    }

    private static List<XElement> findAllChildren(XElement element, String tagName) {
        List<XElement> list = new ArrayList<XElement>();
        for (XNode child : element.getChildren()) {
            if (child instanceof XElement) {
                XElement e = (XElement) child;
                List<XElement> children = findAllChildren(e, tagName);
                list.addAll(children);
                if (e.getName().equals(tagName.toLowerCase())) {
                    list.add(e);
                }
            }
        }
        return list;
    }

    private static XElement findIterators(XElement mainElement) {
        return findDeepestElementIterator(mainElement);
    }

    private static XElement findDeepestElementIterator(XElement mainElement) {
        List<XElement> list = mainElement.getElements();
        for (XElement e : list) {
            XElement deep = findDeepestElementIterator(e);
            if (deep != null) {
                return deep;
            } else if ((e.getName().equals("xiterator") && e.getHiddenAttribute("xiteratorStatus") == null)
                    || ((e.getAttribute("data-xiterator-list") != null || e.getAttribute("data-xiterator-count") != null)
                    && e.getTempAttribute("prepared-iterator") == null)) {
                return e;
            }
        }
        return null;
    }

    private static XElement findDeepestXIterator(XElement mainElement) {
        List<XElement> list = mainElement.getElementsByName("xiterator");
        if (list != null && !list.isEmpty()) {
            XElement e = null;
            for (int i = 0; i < list.size(); i++) {
                e = list.get(i);
                if (e.getHiddenAttribute("xiteratorStatus") == null) {
                    break;
                }
            }
            if (e != null) {
                XElement deep = findDeepestXIterator(e);
                if (deep == null && e.getHiddenAttribute("xiteratorStatus") == null) {
                    return e;
                } else {
                    return deep;
                }
            }
        }
        return null;
    }

    private static XElement findDeepestChild(XElement mainElement, String tagName) {
        List<XElement> list = mainElement.getElementsByName(tagName);
        if (list != null && !list.isEmpty()) {
            XElement e = list.get(0);
            XElement deep = findDeepestChild(e, tagName);
            if (deep == null) {
                return e;
            } else {
                return deep;
            }
        }
        return null;
    }

    protected static XElement findDeepestChildWithAttribute(XElement mainElement, String attributeName) {
        List<XElement> list = mainElement.getElementsWithAttribute(attributeName);
        if (list != null && !list.isEmpty()) {
            XElement e = list.get(0);
            XElement deep = findDeepestChildWithAttribute(e, attributeName);
            if (deep == null) {
                return e;
            } else {
                return deep;
            }
        }
        return null;
    }

    public static void mainx(String[] args) {
        try {
            XJS.prepareComponents(XStreamUtil.inputStreamToString(
                    new FileInputStream("/Users/eduardo/work/eclipseworkspaces/xloja/Testes/teste.js")));
            String htmlIn = XStreamUtil.inputStreamToString(
                    new FileInputStream("/Users/eduardo/work/eclipseworkspaces/xloja/Testes/teste.html"));
            XHTMLParser parser = new XHTMLParser();
            XHTMLDocument doc = parser.parse(htmlIn);
            // buildComponent("texto", "components['texto']", doc, new
            // StringBuffer());
            System.out.println(doc);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }



    public static class AttributeType {
        int id;

        public AttributeType defaultValue(Object o) {
            return this;
        }

        AttributeType(int id) {
            this.id = id;
        }

        @Override
        public boolean equals(Object obj) {
            return id == ((AttributeType) obj).id;
        }
    }

    public static class Mandatory {
        public AttributeType string = new AttributeType(8);
        public AttributeType number = new AttributeType(9);
        public AttributeType bool = new AttributeType(10);
        public AttributeType boundVariable = new AttributeType(11);
        public AttributeType innerHTML = new AttributeType(12);
        public AttributeType bind = new AttributeType(13);
        public AttributeType script = new AttributeType(14);
        public AttributeType any = new AttributeType(16);
    }

    public static class Types {
        public AttributeType string = new AttributeType(1);
        public AttributeType number = new AttributeType(2);
        public AttributeType bool = new AttributeType(3);
        public AttributeType boundVariable = new AttributeType(4);
        public AttributeType innerHTML = new AttributeType(5);
        public AttributeType bind = new AttributeType(6);
        public AttributeType script = new AttributeType(7);
        public AttributeType any = new AttributeType(15);
        public Mandatory mandatory = new Mandatory();
    }

    public static final Types TYPES = new Types();
}
