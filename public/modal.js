var modal = document.getElementById("myModal");
var btn = document.getElementById("vezirezervare");

var span = document.getElementsByClassName("close")[0];

btn.onclick = function() {
    modal.style.display = "block";
}

span.onclick = function() {
    modal.style.display = "none";
}