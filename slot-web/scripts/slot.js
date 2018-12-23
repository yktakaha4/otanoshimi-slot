/* global window */
/* global $ */

var sontaku = {
  data: {
    persons: [],
    gifts: [],
    lots: []
  },
  props: {
    preloaded: false,
    state: "waiting",
    pikaring: false,
    startSpeeds: [800, 600, 400, 300, 200, 150, 100, 50],
    stopSpeeds: [100, 125, 150, 175, 200, 250, 300, 400,
      500, 700, 900],
    slowStopSpeeds: [100, 125, 150, 175, 200, 250, 300, 400,
      500, 700, 900, 1200, 1500],
    timers: []
  },
  functions: {},
  utils: {}
};

sontaku.utils.distance = function distance(cur, dst, len) {
  return (cur <= dst) ? (dst - cur) : ((len - cur) + dst); 
};

sontaku.utils.choose = function (customize) {
  sontaku.functions.endWinning();
  if ($(".slot-wheel").hasClass("slick-initialized")) {
    $(".slot-wheel").slick("unslick");
  }
  $(".slot-wheel")
    .empty()
    .replaceWith($(".templates .wheel > *").clone());

  customize();

  $(".slot-wheel").slick({
    arrows: false,
    infinite: true,
    slidesToShow: 3,
    slidesToScroll: 1,
    centerMode: true,
    variableWidth: true,
    autoplay: true,
    autoplaySpeed: 0,
    speed: 1000,
    pauseOnFocus: false,
    pauseOnHover: false,
    cssEase: 'ease',
    useCSS: true,
    useTransform: true
  }).slick("slickPause");
};

sontaku.utils.setImageSrc = function (image, normalImage, errorImage) {
  var setDefaultImage = function () {
    image.attr("src", errorImage);
  };
  image.on("error", setDefaultImage);
  if (normalImage) {
    if (!normalImage.endsWith("/")) {
      image.attr("src", normalImage);
    } else {
      setDefaultImage();
    }
  } else {
    setDefaultImage();
  }
};

sontaku.functions.initialSlot = function () {
  if (sontaku.props.state !== "waiting") {
    return;
  }
  sontaku.utils.choose(function () {
    $(".top_title").text("おたのしみスロット");
    $(".organization_name").text("どこの");
    $(".person_name").text("？？？");
    $(".person_image").attr("src", "images/question.png");
    $(".gift_name").text("何を");
    
    for (var i = 0;i < 10; i++) {
      var element = $(".templates .gift > *").clone();
      element.find(".slot-item-tape").remove();
      sontaku.utils.setImageSrc(element.find(".gift_image"), "images/jitsu.jpg", "images/gift.png");
      element.appendTo($(".slot-wheel"));
    }
  });
  $(".slot-wheel")
    .slick("slickSetOption", "speed", 3000, false)
    .slick("slickPlay");
  return 0;
};

sontaku.functions.chooseGroup = function (groups) {
  if (sontaku.props.state !== "waiting") {
    return;
  }
  sontaku.utils.choose(function () {
    $(".top_title").text("どこの？");
    $(".organization_name").text("どこの");
    $(".person_name").text("？？？");
    $(".person_image").attr("src", "images/question.png");
    $(".gift_name").text("何を");

    groups.forEach(function (group, index) {
      var element = $(".templates .group > *").clone();
      element.attr("data-index", index).find(".item_text").text(group);
      element.appendTo($(".slot-wheel"));
    });
  });
  return 0;
};

sontaku.functions.choosePerson = function (group, persons, winningLots) {
  if (sontaku.props.state !== "waiting") {
    return;
  }
  sontaku.utils.choose(function () {
    $(".organization_name").text(group + "の");
    $(".top_title").text("誰に？");
    $(".person_name").text("？");
    $(".person_image").attr("src", "images/question.png");
    $(".gift_name").text("何を");

    persons.forEach(function (person, index) {
      var element = $(".templates .person > *").clone();
      if (winningLots.find(function (e) {
          return (e.person_name === person.name) && (e.group === group);
        })) {
        element.find(".slot-person-image").addClass("winning-image");
      }
      sontaku.utils.setImageSrc(
        element.find(".slot-person-image"), person.image_url,
        person.sex === "男" ? "images/man.png" : "images/woman.png");
      element.attr("data-index", index).find(".item_text").text(person.name);
      element.appendTo($(".slot-wheel"));
    });
  });
  return 0;
};

sontaku.functions.chooseGift = function (person, gifts, winningLots) {
  if (sontaku.props.state !== "waiting") {
    return;
  }
  sontaku.utils.choose(function () {
    $(".organization_name").text(person.group + "の");
    $(".top_title").text("何を？");
    $(".person_name").text(person.name);
    sontaku.utils.setImageSrc(
      $(".person_image"), person.image_url,
      person.sex === "男" ? "images/man.png" : "images/woman.png");
    $(".gift_name").text("何を");

    gifts.forEach(function (gift, index) {
      var element = $(".templates .gift > *").clone();
      if (winningLots.find(function (e) {
          return e.gift_name === gift.name;
        })) {
        element.find(".slot-item-gift").addClass("winning-image");
      }
      element.attr("data-index", index).find(".item_text").text(gift.name);
      sontaku.utils.setImageSrc(element.find(".gift_image"), gift.slot_image_url, "images/gift.png");
      element.appendTo($(".slot-wheel"));
    });
  });
  return 0;
};

sontaku.functions.stopSlot = function (selectedIndex, speed) {
  if (sontaku.props.state !== "running") {
    return;
  }
  sontaku.props.state = "busy";
  
  var empty = false;
  var speeds = [].concat(speed === "普通" ? sontaku.props.stopSpeeds : sontaku.props.slowStopSpeeds),
    changeSpeed = function () {
      if (speeds.length === 0 && !empty) {
        empty = true;
        sontaku.props.timers.forEach(window.clearTimeout);
        sontaku.props.timers = [];
        
        $(".slot-wheel").on("afterChange", function (slick, slide, index) {
          var currentIndex = index;

          window.console.log(selectedIndex, currentIndex);
          if (currentIndex === selectedIndex && sontaku.props.state === "busy") {
            sontaku.props.state = "waiting";
            sontaku.utils.stopSound();
            $(".slot-wheel")
              .off("afterChange")
              .slick("slickPause");
            window.setTimeout(function() {
              $(".slot-wheel").slick("goTo", selectedIndex, false);
              sontaku.utils.playSound("stop");
            }, 1000);
          }
        });
      } else {
        $(".slot-wheel").foggy(false);

        var speed = speeds.shift();
        $(".slot-wheel").slick("slickSetOption", "speed", speed, false);
        sontaku.props.timers.push(
          window.setTimeout(changeSpeed, Math.max(1000, speed * 2)));
      }
    };
  changeSpeed(changeSpeed, 5000);
  return 0;
};

sontaku.functions.startSlot = function () {
  if (sontaku.props.state !== "waiting") {
    return;
  }
  sontaku.props.state = "busy";

  $(".slot-wheel .slot-item").css("list-style", "none");
  var speeds = [].concat(sontaku.props.startSpeeds),
    changeSpeed = function () {
      if (speeds.length === 0) {
        $(".slot-wheel").foggy(false).foggy({
          blurRadius: 5,
          opacity: 1,
          cssFilterSupport: true
        });
        sontaku.props.state = "running";
      } else {
        var speed = speeds.shift();
        $(".slot-wheel").slick("slickSetOption", "speed", speed, false);
        window.setTimeout(changeSpeed, speed);
      }
    };
  $(".slot-wheel").slick("slickPlay");
  sontaku.utils.playSound("roll-loop");
  changeSpeed(changeSpeed, 1000);
  return 0;
};

sontaku.functions.stopPika = function () {
  if (!sontaku.props.pikaring) {
    return;
  }
  sontaku.props.pikaring = false;
  $(".pikapika").css("display", "none");
};

sontaku.functions.initPika = function () {
  var pika = function (selector, type) {
    var ray = type ? "red" : "white";
    var bg = type ? "white" : "red";
    $(selector).pow({
      rays: 32,
      rayColorStart: ray,
      rayColorEnd: ray,
      bgColorStart: bg,
      bgColorEnd: bg,
      originX: "50%",
      originY: "50%"
    });
  };
  pika(".pikapika.fore", false);
  pika(".pikapika.alt", true);
  $(".pikapika").css("display", "none");
};

sontaku.functions.startPika = function (type) {
  var pika = function () {
    $(".pikapika").css("display", "block");
    if (typeof type !== "boolean") {
      type = false;
    }
    $(".pikapika.alt").css("display", type ? "block" : "none");
    if (sontaku.props.pikaring) {
      sontaku.props.pikaTimers = window.setTimeout(sontaku.functions.startPika(!type), 200);
    } else {
      $(".pikapika").css("display", "none");
    }
  };
  if (typeof type === "undefined") {
    if (sontaku.props.pikaring) {
      return;
    }
    sontaku.props.pikaring = true;
    pika();
  } else {
    return pika;
  }
};

sontaku.functions.startWinning = function (gift) {
  if (sontaku.props.state !== "waiting") {
    return;
  }
  var img;
  if (gift.type === "はずれ") {
    $(".main").addClass("losing");
    $(".top_title").text("おめでとうございます…？");
    img = $(".slot-wheel .slick-active .gift_image");
    img.fadeOut(4000, function () {
      img
        .attr("src", gift.winning_image_url)
        .fadeIn(4000);
    });
    sontaku.utils.playSound("hazure");
  } else if (gift.type === "大当たり") {
    $(".main").addClass("losing");
    $(".top_title").text("おめでとうございます…？");
    img = $(".slot-wheel .slick-active .gift_image");
    img.fadeOut(4000, function () {
      img
        .attr("src", gift.winning_image_url)
        .fadeIn(4000, function () {
          $(".main").removeClass("losing").addClass("winning");
          $(".top_title").text("おめでとうございます！！！");
          sontaku.utils.playSound("ooatari");
          sontaku.functions.startPika();
        });
    });
    sontaku.utils.playSound("hazure");
  } else {
    $(".main").addClass("winning");
    $(".top_title").text("おめでとうございます！");
    sontaku.utils.playSound("atari");
    sontaku.functions.startPika();
  }
  return 0;
};

sontaku.functions.endWinning = function () {
  $(".main").removeClass("winning").removeClass("losing");
  sontaku.functions.stopPika();
};

sontaku.utils.preload = function () {
  try {
    if (sontaku.props.preloaded) {
      return;
    }
    sontaku.data.persons.forEach(function (person) {
      $("<img>").attr("src", person.image_url);
    });
    sontaku.data.gifts.forEach(function (gift) {
      $("<img>").attr("src", gift.slot_image_url);
      $("<img>").attr("src", gift.winning_image_url);
    });

    $(".sounds").empty();
    ["ooatari", "atari", "hazure", "stop", "roll-loop"].forEach(function (name) {
      var audio = $("<audio>");
      audio.attr({
        class: name,
        src: "sounds/" + name + ".mp3",
        preload: "auto"
      }).appendTo($(".sounds"));
    });

    sontaku.props.preloaded = true;
  } catch (e) {
    window.console.warn(e);
  }
};

sontaku.utils.playSound = function (name) {
  $(".sounds audio").each(function (i, audio) {
    try {
      audio.pause();
    } catch (e) {
      window.console.warn(e);
    }
  });
  try {
    var audio = $(".sounds").find("." + name)[0];
    audio.load();
    audio.play();
  } catch (e) {
    window.console.warn(e);
  }
};

sontaku.utils.stopSound = function () {
  $(".sounds audio").each(function (i, audio) {
    try {
      audio.pause();
    } catch (e) {
      window.console.warn(e);
    }
  });
};

sontaku.functions.action = function (slotType, actionType, order) {
  sontaku.utils.preload();
  window.console.log(slotType, actionType, order);
  if (actionType === "init") {
    $(".main").css("opacity", 1);
    return 0;
  }
  var winningLots = sontaku.data.lots.slice(0, order);
  var lot = sontaku.data.lots[order];
  var groups = $.unique($.map(sontaku.data.persons, function (person) {
    return person.group;
  }).sort());
  var persons = $.grep(sontaku.data.persons, function (person) {
    return person.group === lot.group;
  });
  var person = $.grep(persons, function (p) {
    return p.name === lot.person_name;
  })[0];
  var gifts = sontaku.data.gifts;
  var gift = $.grep(gifts, function (g) {
    return g.name === lot.gift_name;
  })[0]; 
  switch (actionType) {
    case "prepare":
      switch (slotType) {
        case "group":
          window.console.log(groups);
          return sontaku.functions.chooseGroup(groups);
        case "person":
          window.console.log(lot.group, persons);
          return sontaku.functions.choosePerson(lot.group, persons, winningLots);
        case "gift":
          window.console.log(person, gifts);
          return sontaku.functions.chooseGift(person, gifts, winningLots);
      }
      break;
    case "start":
      switch (slotType) {
        case "group":
          window.console.log(groups);
          sontaku.functions.chooseGroup(groups);
          break;
        case "person":
          window.console.log(lot.group, persons);
          sontaku.functions.choosePerson(lot.group, persons, winningLots);
          break;
        case "gift":
          window.console.log(person, gifts);
          sontaku.functions.chooseGift(person, gifts, winningLots);
          break;
      }
      return sontaku.functions.startSlot();
    case "stop":
      var selectedIndex = null;
      switch (slotType) {
        case "group":
          selectedIndex = groups.indexOf(lot.group);
          break;
        case "person":
          selectedIndex = persons.findIndex(function (p) {
            return p.name === lot.person_name;
          });
          break;
        case "gift":
          selectedIndex = gifts.findIndex(function (g) {
            return g.name === lot.gift_name;
          });
          break;
      }
      return sontaku.functions.stopSlot(selectedIndex, gift.speed);
    case "winning":
      selectedIndex = gifts.findIndex(function (g) {
        return g.name === lot.gift_name;
      });
      sontaku.functions.chooseGift(person, gifts, winningLots);
      $(".slot-wheel").slick("goTo", selectedIndex, true);
      return sontaku.functions.startWinning(gift);
  }
}

$(function () {
  sontaku.functions.initPika();
  sontaku.functions.initialSlot();
});
