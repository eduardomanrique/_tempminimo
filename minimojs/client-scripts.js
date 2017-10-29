const resources = require('./resources');
const components = require('./components');
const util = require('./util');
const _ = require('underscore');
const esprima = require('esprima');
const esprimaUtil = require('./esprimaUtil');

const context = require('./context');
const fs = require('fs');



    public void reload(String metaClasses, String resourceInfoMap) throws IOException {
        String mainScript = XFileUtil.instance.getResource("/x/x.js");

        StringBuilder modules = new StringBuilder();
        for (String md : modulesToAdd) {
            modules.append(getScriptModule(md));
        }

        mainScript = replaceString(mainScript, "%xmodulescripts%", modules.toString());

        mainScript = replaceString(mainScript, "%resourceInfoMap%", resourceInfoMap);

        String defaultDateFormat = X.getProperty("defaultdateformat");
        defaultDateFormat = defaultDateFormat == null ? "" : defaultDateFormat;
        mainScript = replaceAllStrings(mainScript, "%defaultdateformat%", defaultDateFormat);

        String defaultDateTimeFormat = X.getProperty("defaultdatetimeformat");
        defaultDateTimeFormat = defaultDateTimeFormat == null ? "" : defaultDateTimeFormat;
        mainScript = replaceAllStrings(mainScript, "%defaultdatetimeformat%", defaultDateTimeFormat);

        String defaultTimeFormat = X.getProperty("defaulttimeformat");
        defaultTimeFormat = defaultTimeFormat == null ? "" : defaultTimeFormat;
        mainScript = replaceAllStrings(mainScript, "%defaulttimeformat%", defaultTimeFormat);

        logger.debug("Initializing js scripts...");
        mainScript = mainScript.replace("%meta%", metaClasses).replace("%ctx%", X.getContextPath());
        mainScript = mainScript.replace("%servletMode%", X.isRunningInServletContainer() + "");

        String currencyFormatter = "";
        if (X.getProperty("currency.decimal.separator") != null) {
            currencyFormatter += "\n_default_decimal_separator = '"
                    + X.getProperty("currency.decimal.separator") + "';\n";
        }
        if (X.getProperty("currency.thousand.separator") != null) {
            currencyFormatter += "\n_default_thousand_separator = '"
                    + X.getProperty("currency.thousand.separator") + "';\n";
        }
        mainScript = replaceString(mainScript, "%currency_formatter%", currencyFormatter);

        mainScript = replaceString(mainScript, "%xdevmode%", String.valueOf(XContext.isDevMode()));

        mainScript = replaceString(mainScript, "%parameters_loaded%", X.isRunningInServletContainer() ? "if(!window._x_parameters_loaded){\nreturn false;\n}\n" : "");

        //mainScript = replaceString(mainScript, "%isspa%", String.valueOf("true".equalsIgnoreCase(X.getProperty("spa"))));

        logger.debug("Applying templates...");

        mainScript = replaceString(mainScript, "%popupmodaltemplates%",
                XTemplates.preparePopupModalTemplates(X.getProperty("popup.modal.templates")));
        String jsComponent = XComponents.getJsComponents();

        logger.debug("Initializing XComponents...");
        mainScript = replaceString(mainScript, "%xcomponents%", jsComponent);
        String debugFlags = X.getProperty("js.debug.flags");
        if (debugFlags != null) {
            String[] splitDebugFlags = debugFlags.split(",");
            debugFlags = "";
            for (String debug : splitDebugFlags) {
                debugFlags += "'" + debug.trim() + "',";
            }
            mainScript = replaceString(mainScript, "%debug_flags%", debugFlags);
        } else {
            mainScript = replaceString(mainScript, "%debug_flags%", "");
        }

        logger.debug("Initializing js scripts template...");

        mainScript = mainScript.replaceAll("%sitedomain%", "").replaceAll("%is_remote%", "false");

        if (X.getProperty("load.jquery") != null
                && X.getProperty("load.jquery").equalsIgnoreCase("true")) {
            scripts = XFileUtil.instance.getResource("/thirdparty/jquery-1.6.1.min.js")
                    + XFileUtil.instance.getResource("/thirdparty/jquery.maskedinput.min.js")
                    + XFileUtil.instance.getResource("/thirdparty/jquery.priceformat.1.7.min.js") + mainScript;
        } else {
            scripts = mainScript;
        }
    }

    private String getScriptModule(String name) throws IOException {
        return "var " + name
                + " = addModule(function(xInstance){\nvar thisX = xInstance;var X = thisX;\n\t\t\tvar thisModule = this; \n\t\t\tfunction _expose(fn, name){xexpose(thisModule, fn, false, name);};"
                + "\n\t\t\tfunction _external(fn, name){xexpose(thisModule, fn, true, name);};\n"
                + XFileUtil.instance.getResource("/x/" + name + ".js") + "\n\t\t});";
    }


    private String replaceString(String str, String patternReplace, String newStr) {
        int index = str.indexOf(patternReplace);
        return str.substring(0, index) + newStr + str.substring(index + patternReplace.length());
    }

    private String replaceAllStrings(String str, String patternReplace, String newStr) {
        while (str.indexOf(patternReplace) >= 0) {
            str = replaceString(str, patternReplace, newStr);
        }
        return str;
    }


    public String getScript() {
        return scripts;
    }

module.exports = {
};