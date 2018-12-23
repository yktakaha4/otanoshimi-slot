/* global window */
/* global $ */
/* global AWS */
/* global cuid */

var sontaku = {
  props: {
    url: "https://script.google.com/macros/s/xxxxx/exec"
  },
  functions: {}
};

sontaku.functions.shuffle = function (arr) {
  var array = [].concat(arr);
  var n = array.length, t, i;
  while (n) {
    i = Math.floor(Math.random() * n--);
    t = array[n];
    array[n] = array[i];
    array[i] = t;
  }
  return array;
};

sontaku.functions.verify = function (e) {
  e.preventDefault();
  $(".unauth").addClass("d-none");
  $(".main").addClass("d-none");
  $(".verify_form *").prop("disabled", true);
  $.ajax({
    url: sontaku.props.url,
    method: "post",
    data: {
      token: $(".access_key").val()
    }
  }).then(
    function (data) {
      $(".verify_form *").prop("disabled", false);
      try {
        if (data.ok !== "ok") {
          $(".unauth")
            .removeClass("d-none")
            .find(".alert")
            .text("認証できませんでした...");
          return;
        }

        sontaku.data = data;
        sontaku.data.gifts = sontaku.functions.shuffle(sontaku.data.gifts);
        sontaku.data.persons = sontaku.functions.shuffle(sontaku.data.persons);
        
        $(".slot_table tbody").empty();
        var prepareRow = $(".templates").find(".table_row tr").clone();
        prepareRow
          .find(".btn")
          .attr("data-action-type", "init")
          .addClass("btn-danger").text("起動")
          .on("click", sontaku.functions.doSlotAction);
        
        $(".slot_table tbody").append(prepareRow);
        
        sontaku.data.lots.forEach(function (lot) {
          ["group", "person", "gift"].forEach(function (slotType) {
            ["prepare", "start", "stop", "winning"].forEach(function (actionType) {
              var row = $(".templates").find(".table_row tr").clone();

              switch (slotType) {
                case "gift":
                  row.find(".gift").text(lot.gift_name);
                  // fallthrough
                case "person":
                  row.find(".person").text(lot.person_name);
                  // fallthrough
                case "group":
                  row.find(".group").text(lot.group);
                  // fallthrough
                default:
                  break;
              }

              var btn = row
                .find(".btn")
                .attr("data-order", lot.order)
                .attr("data-slot-type", slotType)
                .attr("data-action-type", actionType)
                .on("click", sontaku.functions.doSlotAction);
              switch (actionType) {
                case "prepare":
                  btn.addClass("btn-info").text("準備");
                  break;
                case "start":
                  btn.addClass("btn-primary").text("スタート");
                  break;
                case "stop":
                  btn.addClass("btn-secondary").text("ストップ");
                  break;
              }

              
              if (actionType === "winning") {
                if (slotType === "gift") {
                  btn.addClass("btn-danger").text("あたり");
                } else {
                  return;
                }
              }
              $(".slot_table tbody").append(row);
            });
          });
        });

        sontaku.props.s3client = function () {
          AWS.config.region = sontaku.data.s3_credential.split(":")[0];
          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: sontaku.data.s3_credential
          });
          return new AWS.S3({
            params: {
              Bucket: data.s3_bucket
            }
          });
        };
        $(".unauth").addClass("d-none");
        $(".main").removeClass("d-none");
      } catch (e) {
        $(".verify_form *").prop("disabled", false);
        $(".main").addClass("d-none");
        $(".unauth")
          .removeClass("d-none")
          .find(".alert")
          .text("予期せぬエラーが発生しました...");
        window.console.error(e);
      }
    },
    function () {
      $(".unauth")
        .removeClass("d-none")
        .find(".alert")
        .text("通信エラーが発生しました...");
    }
  );
};

sontaku.functions.uploadFile = function (e) {
  e.preventDefault();
  $(".file_upload_form *").prop("disabled", true);

  var fileKey = cuid();
  var file = $(".file_select").prop("files")[0];

  var errMessage = null;
  if (!file.type.startsWith("image/")) {
    errMessage = "画像ファイルではありません...";
  } else if (file.size > 1048576) {
    errMessage = "サイズが1MBを超えています...";
  }

  if (errMessage) {
    var dstr = new Date().toLocaleString();
    var alert = $(".templates .alert_dismissible > *").clone();
    alert
      .addClass("alert-danger")
      .find(".message")
      .text(errMessage + "(" + dstr + ")");
    $(".alert_area").append(alert);
    $(".file_upload_form *").prop("disabled", false);
    return;
  }

  sontaku.props.s3client().putObject({
    Key: fileKey,
    ContentType: file.type,
    Body: file,
    ACL: "public-read"
  }, function (err) {
    var alert = $(".templates .alert_dismissible > *").clone();
    var dstr = new Date().toLocaleString();
    if (!err) {
      alert
        .addClass("alert-success")
        .find(".message")
        .text("ファイルをアップロードしました。以下のIDをシートに貼り付けて下さい(" + dstr + ")")
        .append($("<br><strong>").text(fileKey))
        .append($("<span>&nbsp;</span>"))
        .append($("<a>").attr({
          target: "_blank",
          href: "https://s3.amazonaws.com/" + sontaku.data.s3_bucket + "/" + fileKey
        }).text("表示"));
    } else {
      alert
        .addClass("alert-danger")
        .find(".message")
        .text("ファイルのアップロードに失敗しました...(" + dstr + ")");
      window.console.error(err);
    }
    $(".alert_area").prepend(alert);
    $(".file_upload_form *").prop("disabled", false);
  });
};

sontaku.functions.openSlot = function (e) {
  e.preventDefault();
  var slotWindow = window.open("slot.html");
  sontaku.props.slotWindow = slotWindow;
};

sontaku.functions.doSlotAction = function (e) {
  e.preventDefault();
  var target = $(e.target);
  var w = sontaku.props.slotWindow;
  if (!w) {
    return;
  } else if (w.closed) {
    return;
  }
  w.sontaku.data.persons = sontaku.data.persons;
  w.sontaku.data.gifts = sontaku.data.gifts;
  w.sontaku.data.lots = sontaku.data.lots;
  
  var slotType = target.attr("data-slot-type");
  var actionType = target.attr("data-action-type");
  var order = target.attr("data-order");
  var status = w.sontaku.functions.action(slotType, actionType, order);
  if (status === 0) {
    $(".slot_table tr").removeClass("table-active");
    target.closest("tr").addClass("table-active");
  }
}

$(".verify_form").on("submit", sontaku.functions.verify);
$(".file_upload_form").on("submit", sontaku.functions.uploadFile);
$(".open_slot").on("click", sontaku.functions.openSlot);
