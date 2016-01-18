(function() {
    $("#record").clone().attr("id", "myRecord").prependTo($("#barInner"));
    $("#record").remove();
    $("#myRecord").click(
        function() {
            var title = $("#title").text();
            $.ajax({
                url: "http://67.167.224.185:1337/record_ttv",
                method: "POST",
                type: "POST",
                crossDomain: true,
                data: {title: title, time: $("#time").text(), channel: $("#channel").text()}
            }).always(
                function(data) {
                    alert(data);
                }
            );
        });
}());