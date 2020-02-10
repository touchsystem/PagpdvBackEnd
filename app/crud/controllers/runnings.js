module.exports = {
    header: {
        height: '3cm', contents: function (page) {
            return '<header class="pdf-header" style=" overflow:hidden; font-size: 10px; padding: 10px; margin: 0 -15px; color: #fff; background: none repeat scroll 0 0 #00396f;"><p> XYZ </p></header>'
        }
    },

    footer: {
        height: '3cm', contents: function (page) {
            return '<footer class="pdf-footer" style="font-size: 10px; font-weight: bold; color: #000;><p style="margin: 0">Powered by XYZ</p></footer>'
        }
    },

}