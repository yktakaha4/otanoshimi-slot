// REST
function doPost(event) {
  var response = { error: "error" };

  try {
    var token = SpreadsheetApp.getActive().getSheetByName("抽選").getRange("B1").getValue();
    var s3_credential = SpreadsheetApp.getActive().getSheetByName("抽選").getRange("C1").getValue();
    var s3_bucket = SpreadsheetApp.getActive().getSheetByName("抽選").getRange("D1").getValue();
    var url_prefix = "https://s3.amazonaws.com/" + s3_bucket + "/";
    if(event.parameter.token == token) {
      response = {
        ok: "ok",
        persons: getPersons(url_prefix),
        gifts: getGifts(url_prefix),
        lots: getLots(),
        s3_credential: s3_credential,
        s3_bucket: s3_bucket
      };
    }
  } catch(error) {
    console.log(error);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON); 
}

// 抽選
function drawLots() {
  var persons = getPersons();
  var gifts = getGifts();
  var ngRules = getNgRules();

  // グループ毎の当選回数を定義
  var groups = [];
  persons.forEach(function(person) {
    if (groups.indexOf(person.group) == -1) {
      groups.push(person.group);
    }
  });
  groups = groups.map(function(group) {
    return { name: group, gifts: [] };
  });
  
  // 重複当選させない景品から抽選するため事前に並び替え
  gifts.sort(function(l, r) {
    if (l.type == "粗品" || r.type == "粗品") {
      if (!(l.type == "粗品" && r.type == "粗品")) {
        return l.type != "粗品" ? -1 : 1;
      }
    }
    return 0;
  });
  
  var lots = [];
  gifts.forEach(function(gift) {
    // グループの決定
    var selectingGroups = [].concat(groups);
    // NGルールに該当する対象は当選させない
    selectingGroups = selectingGroups.filter(function(group) {
      return ngRules.filter(function(ngRule) {
        if (ngRule.key == "グループ") {
          return ngRule.name == gift.name && ngRule.value == group.name;
        } else {
          return false;
        }
      }).length == 0;
    });
    // ランダムに並べ替え
    selectingGroups = shuffle(selectingGroups);
    selectingGroups.sort(function(l, r) {
      // 同じグループに大当たり、当たり、はずれを複数回当選させない
      if (gift.type != "粗品") {
        if (l.type == "粗品" || r.type == "粗品") {
          if (l.type != r.type) {
            return l.type == "粗品" ? -1 : 1
          }
        }
      }
      // グループ毎の当選回数を均等にする
      return l.gifts.length == r.gifts.length ? 0 : l.gifts.length < r.gifts.length ? -1 : 1;
    });
    // グループの確定
    var group = selectingGroups[0];
    group.gifts.push(gift.name);
    
    // 人の決定
    var selectingPersons = [].concat(persons).filter(function(person) {
      return group.name == person.group;
    });
    // NGルールに該当する対象は当選させない
    selectingPersons = selectingPersons.filter(function(person) {
      return ngRules.filter(function(ngRule) {
        if (ngRule.key == "人物名") {
          return ngRule.name == gift.name && ngRule.value == person.name;
        } else if (ngRule.key == "性別") {
          return ngRule.name == gift.name && ngRule.value == person.sex;
        } else {
          return false;
        }
      }).length == 0;
    });
    // ランダムに並べ替え
    selectingPersons = shuffle(selectingPersons);
    // 同じ人には複数回当選させない
    var winningPersons = lots.map(function(lot) {
      return lot.person_name;
    });
    selectingPersons.sort(function(l, r) {
      var lc = winningPersons.filter(function(p) { return l.name == p; }).length;
      var rc = winningPersons.filter(function(p) { return r.name == p; }).length;
      return lc == rc ? 0 : lc < rc ? -1 : 1;
    });
    // 人の確定
    var person = selectingPersons[0];
    
    lots.push({
      group: group.name,
      person_name: person.name,
      gift_name: gift.name,
      order: gift.order
    });
  });
  
  // 景品一覧の順番に並べなおす
  lots.sort(function(l, r) {
    return l.order == r.order ? 0 : l.order < r.order ? -1 : 1;
  });
  
  // セルに描画
  setLots(lots);
}

// もろもろ
function setLots(lots) {
  var lotsSheet = SpreadsheetApp.getActive().getSheetByName("抽選");
  
  lotsSheet.getRange("A3:Z100").clearContent();
  
  var row = 3;
  lots.forEach(function(lot){
    lotsSheet.getRange(row, 1).setValue(lot.group);
    lotsSheet.getRange(row, 2).setValue(lot.person_name);
    lotsSheet.getRange(row, 3).setValue(lot.gift_name);
    row += 1;
  });
}

function getLots() {
  var lotsSheet = SpreadsheetApp.getActive().getSheetByName("抽選");
  var row = 3;

  var lots = [];
  while (!lotsSheet.getRange(row, 1).isBlank()) {
    lots.push({
      group: lotsSheet.getRange(row, 1).getValue(),
      person_name: lotsSheet.getRange(row, 2).getValue(),
      gift_name: lotsSheet.getRange(row, 3).getValue(),
      order: row - 3
    });
    row += 1;
  }
  return lots;
}

function getPersons(url_prefix) {
  var personSheet = SpreadsheetApp.getActive().getSheetByName("人物一覧");
  var row = 2;

  var persons = [];
  while (!personSheet.getRange(row, 1).isBlank()) {
    if (personSheet.getRange(row, 5).isBlank()) {
      persons.push({
        name: personSheet.getRange(row, 1).getValue(),
        sex: personSheet.getRange(row, 2).getValue(),
        group: personSheet.getRange(row, 3).getValue(),
        image_url: url_prefix + personSheet.getRange(row, 4).getValue(),
        order: row - 2
      });
    }
    row += 1;
  }
  return persons;
}

function getGifts(url_prefix) {
  var giftSheet = SpreadsheetApp.getActive().getSheetByName("景品一覧");
  var row = 2;

  var gifts = [];
  while (!giftSheet.getRange(row, 1).isBlank()) {
    gifts.push({
      name: giftSheet.getRange(row, 1).getValue(),
      type: giftSheet.getRange(row, 2).getValue(),
      slot_image_url: url_prefix + giftSheet.getRange(row, 3).getValue(),
      winning_image_url: url_prefix + giftSheet.getRange(row, 4).getValue(),
      speed: giftSheet.getRange(row, 5).getValue(),
      order: row - 2
    });
    row += 1;
  }
  return gifts;
}

function getNgRules() {
  var ngRuleSheet = SpreadsheetApp.getActive().getSheetByName("NGルール一覧");
  var row = 2;

  var ngRules = [];
  while (!ngRuleSheet.getRange(row, 1).isBlank()) {
    ngRules.push({
      name: ngRuleSheet.getRange(row, 1).getValue(),
      key: ngRuleSheet.getRange(row, 2).getValue(),
      value: ngRuleSheet.getRange(row, 3).getValue(),
      order: row - 2
    });
    row += 1;
  }
  return ngRules;
}

function shuffle(array) {
  var n = array.length, t, i;

  while (n) {
    i = Math.floor(Math.random() * n--);
    t = array[n];
    array[n] = array[i];
    array[i] = t;
  }

  return array;
}
