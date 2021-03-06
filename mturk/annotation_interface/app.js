'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function toggleTypeButton($btn) {
    if (!$btn.hasClass('disabled')) $btn.toggleClass('btn-primary btn-success selected');
}

// function unSelectTypeButton($btn) {
//     if (!$btn.hasClass('disabled') && $btn.hasClass('selected'))
//         $btn.toggleClass('btn-primary btn-success selected');
// }

function loadFineTypeHtml($parent, coarseType) {
    var liTmpl = document.getElementById('type-list-item-template');
    _.each(globalStore.coarseToFine[coarseType], function (fineType) {
        var $li = $(liTmpl.content.cloneNode(true));
        $li.find('div.btn').attr('value', fineType).addClass('fine-type').text(fineType.split('.').pop().toUpperCase());
        $parent.append($li);
    });
}

function onCoarseTypeClick($liCoarse) {
    toggleTypeButton($liCoarse);
    var coarseType = $liCoarse.attr('value');
    var $fineCol = $liCoarse.closest('.type-row').find('#fine-types-col');
    $fineCol.find('.col-heading').text(coarseType + ' types');
    $fineCol.find('.col-content').empty();
    if ($liCoarse.hasClass('selected')) {
        // remove selected for any other coarse type
        $liCoarse.siblings('div.btn').each(function (i, thatliCoarse) {
            var $thatliCoarse = $(thatliCoarse);
            if (thatliCoarse != $liCoarse[0] && $thatliCoarse.hasClass('selected')) toggleTypeButton($thatliCoarse);
        });

        loadFineTypeHtml($fineCol.find('.col-content'), coarseType);
    } else {
        $fineCol.find('.col-heading').text('No coarse type selected');
    }
}

function onFineTypeClick($liFine) {
    toggleTypeButton($liFine);
}

function onTypeClick($li) {
    if ($li.hasClass('coarse-type')) onCoarseTypeClick($li);else if ($li.hasClass('fine-type')) onFineTypeClick($li);else console.log('Neither coarse nor fine!!');
}

function toggleMenu($node, collapseId) {
    $('#' + collapseId).toggleClass('open-block');
    $node.find('.glyphicon').toggleClass('glyphicon-menu-down glyphicon-menu-up');
}

function getCoarseToFine(typeHier) {
    // given the type-hier as presented in figer_type_hier.json,
    // creates a dictionary from coarse types to all its fine-types
    var getCoarse = function getCoarse(type) {
        while (typeHier.get(type)['parent'] != null) {
            type = typeHier.get(type)['parent'];
        }return type;
    };
    var coarseToFine = {};
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = typeHier[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = _slicedToArray(_step.value, 2),
                type = _step$value[0],
                properties = _step$value[1];

            if (typeHier.has(type)) {
                var coarse = getCoarse(type);
                // add coarse type to dictionary
                if (!coarseToFine[coarse]) coarseToFine[coarse] = [];
                // if this is a fine type add this to the coarse type list
                if (typeHier.get(type)['parent'] != null) coarseToFine[coarse].push(type);
            }
        }
        // sort the fine-types for each coarse type
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }

    _.each(coarseToFine, function (fineTypes, coarseType) {
        fineTypes.sort();
    });
    return coarseToFine;
}

function loadFigerHier() {

    var httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
        alert('Giving up :( Cannot create an XMLHTTP instance');
        return false;
    }

    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
            if (httpRequest.status === 200) {
                var response = JSON.parse(httpRequest.responseText);
                var typeHier = new Map();
                for (var i = 0; i < response.length; i++) {
                    typeHier.set(response[i][0], response[i][1]);
                }globalStore.typeHier = typeHier;
                globalStore.coarseToFine = getCoarseToFine(typeHier);
            } else {
                alert('There was a problem with the figer-hier request.');
            }
        }
    };
    httpRequest.open('GET', './figer_type_hier.json', false);
    httpRequest.send(null);

    console.log('XMLHttpRequest for figer-hier sent.');
}

function getSentenceHTMLElement(sentence) {
    // return string constructed with tokens and spaces in [start, end)
    function getTextFromSpanForTokenSpaces(tokenSpaces, start, end) {
        return tokenSpaces.slice(start, end).reduce(function (acc, tokenSpace) {
            return acc + tokenSpace[0] + tokenSpace[1];
        }, "");
    }

    var wrapTextInMark = function wrapTextInMark(text, eIdx) {
        return '<mark onclick="onMarkClick($(this))" data-entity="" ent-id=' + eIdx + ' >' + text + '</mark>';
    };

    // tuples of tokens, spaces ( => zip(tokens, spaces) )
    var tokenSpaces;
    if (sentence.spaces == undefined) tokenSpaces = _.map(sentence.tokens, function (t) {
        return [t, " "];
    });else tokenSpaces = sentence.tokens.map(function (t, i) {
        return [t, sentence.spaces[i]];
    });

    // clojure
    var getTextFromSpan = function getTextFromSpan(start, end) {
        return getTextFromSpanForTokenSpaces(tokenSpaces, start, end);
    };

    var sentLen = tokenSpaces.length;
    var ents = sentence.ents;

    var sentNode = document.createElement('div');
    // now populate sentNode with sentence contents by iterating through ents
    if (ents.length == 0) sentNode.innerText = getTextFromSpan(0, sentLen);else {
        var sentInnerHTML = "";
        var lastEntEnd = 0;
        _.each(ents, function (ent, eIdx) {
            // add text before the entity
            sentInnerHTML += getTextFromSpan(lastEntEnd, ent.start);
            sentInnerHTML += wrapTextInMark(getTextFromSpan(ent.start, ent.end), eIdx);
            lastEntEnd = ent.end;
        });
        // add text after the last entity
        sentInnerHTML += getTextFromSpan(lastEntEnd, sentLen);
        sentNode.innerHTML = sentInnerHTML;
    }
    return sentNode;
}

function getDocHTMLNode(docJson) {
    // listItem template
    var sentTmpl = document.getElementById('sentence-template');
    var $group = $('<div>', { 'class': 'list-group' });

    _.each(docJson['sentences'], function (sentence, sIdx) {
        var $sc = $(sentTmpl.content.cloneNode(true));
        $sc.find('div.sentence-content').append(getSentenceHTMLElement(sentence));
        $sc.find('span.sentence-list-index').text(parseInt(sIdx) + 1);

        var $li = $('<div>', { 'class': 'list-group-item' }).append($sc).attr('id', 'sentence-' + sIdx);
        $group.append($li);
    });
    return $group[0];
}

function renderDocInNode(docJson, node) {
    var docHtml = getDocHTMLNode(docJson);
    $(node).append(docHtml);
}

function getTypeOptionsHTMLNode(coarseToFine) {
    var $root = $($.parseHTML('<div class="type-select-wrapper" id="type-window"></div>'));
    var curColsCount = 0;
    var liTmpl = document.getElementById('type-list-item-template');

    var $typerow = $(document.getElementById('type-row-template').content.cloneNode(true));
    var $colcontent = $typerow.find('#coarse-types-col .col-content');

    // sort 'em
    var coarseTypes = _.sortBy(_.keys(coarseToFine), function (t) {
        return -coarseToFine[t].length;
    });

    _.each(coarseTypes, function (coarseType) {
        var $li = $(liTmpl.content.cloneNode(true));
        $li.find('div.btn').attr('value', coarseType).addClass('coarse-type').text(coarseType.toUpperCase());
        $colcontent.append($li);
    });

    $root.append($typerow);
    return $root;
}

function addAnnotationsToTypeWindow($typeWindow, sIdx, eIdx) {
    var coarseType = globalStore.docAnnots[sIdx][eIdx]['coarse-type'];
    var $typeWindow = globalStore.$typeWindow;

    // clear previous annotations
    $typeWindow.find('div#coarse-types-col div.btn').each(function (index, el) {
        if ($(el).hasClass('selected')) onCoarseTypeClick($(el));
    });

    if (!coarseType) return;
    onCoarseTypeClick($typeWindow.find('div#coarse-types-col div[value="' + coarseType + '"]'));
    var fineTypes = globalStore.docAnnots[sIdx][eIdx]['fine-types'];
    _.each(fineTypes, function (fineType) {
        onFineTypeClick($typeWindow.find('div#fine-types-col div[value="' + fineType + '"]'));
    });
}

function showTypeAnnotationWindow(sIdx, eIdx) {
    if (!globalStore.$typeWindow) globalStore.$typeWindow = getTypeOptionsHTMLNode(globalStore.coarseToFine);

    var $typeWindow = globalStore.$typeWindow;
    addAnnotationsToTypeWindow($typeWindow, sIdx, eIdx);

    var curEntSelected = globalStore.curEntSelected;

    var hidePromise = hideTypeAnnotationWindow();
    var showPromise = hidePromise.then(function () {
        $('#sentence-' + sIdx).append($typeWindow);
        $typeWindow.hide();
        $typeWindow.slideDown(100);
        return $typeWindow.promise();
    });

    return showPromise;
}

function hideTypeAnnotationWindow() {
    var $typeWindow = globalStore.$typeWindow;
    $typeWindow.slideUp(0);
    var hidePromise = $typeWindow.promise();
    hidePromise.done(function () {
        $typeWindow.remove();
    });
    return hidePromise;
}

function saveCurAnnotations() {
    var $typeWindow = globalStore.$typeWindow;
    if (globalStore.curEntSelected == undefined || $typeWindow[0] == undefined) return;
    var curEntSelected = globalStore.curEntSelected;

    var $coarseTypesSelected = $typeWindow.find('div#coarse-types-col div.btn.selected');
    var $fineTypesSelected = $typeWindow.find('div#fine-types-col div.btn.selected');

    if ($coarseTypesSelected.length > 0) {
        var selectedCoarseType = $coarseTypesSelected[0].getAttribute('value');
        globalStore.docAnnots[curEntSelected.sIdx][curEntSelected.eIdx]['coarse-type'] = selectedCoarseType;
        if ($fineTypesSelected.length > 0) {
            var selectedFineTypes = $fineTypesSelected.map(function (index, div) {
                return div.getAttribute('value');
            });
            globalStore.docAnnots[curEntSelected.sIdx][curEntSelected.eIdx]['fine-types'] = selectedFineTypes;
        }
    }
}

function clearHiglightedMark() {
    // clears the highlight of the current highlighted mark
    if (globalStore.curEntSelected != undefined) {
        var curEntSelected = globalStore.curEntSelected;
        $('div#sentence-' + curEntSelected.sIdx + ' mark[ent-id=' + curEntSelected.eIdx + ']').removeClass('selected');
    }
}

function onMarkClick($mark) {
    var eIdx = parseInt($mark.attr('ent-id'));
    var sIdx = parseInt($mark.closest('div.list-group-item').attr('id').split('-').pop());

    // if closing
    if ($mark.hasClass('selected')) {
        $mark.removeClass('selected');
        saveCurAnnotations();
        hideTypeAnnotationWindow();
        globalStore.curEntSelected = null;
    } else {
        saveCurAnnotations();
        showTypeAnnotationWindow(sIdx, eIdx);
        $mark.addClass('selected');
        clearHiglightedMark();
        globalStore.curEntSelected = { sIdx: sIdx, eIdx: eIdx };
    }
}

function getAnnotationDataStructure(docJson) {
    var docAnnots = {};
    _.each(docJson['sentences'], function (sentence, sIdx) {
        if (sentence.ents.length > 0) {
            docAnnots[sIdx] = {};
            _.each(sentence.ents, function (ent, eIdx) {
                docAnnots[sIdx][eIdx] = { 'coarse-type': null, 'fine-types': [], 'coref': undefined };
            });
        }
    });
    return docAnnots;
}

function loadDocument() {
    $.ajax({
        url: './sample_doc.json',
        dataType: 'json',
        success: function success(data) {
            // sort ents in each sentece by start
            _.each(data['sentences'], function (sentence) {
                sentence.ents.sort(function (e1, e2) {
                    return e1.start - e2.start;
                });
            });
            // validate data and not load if incorrect
            globalStore.docJson = data;
            globalStore.docAnnots = getAnnotationDataStructure(data);
            // render document
            renderDocInNode(data, $('div#doc-view'));
        },
        error: function error(data) {
            globalStore.docJson = null;
        }
    });
}

function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function getMTurkParams() {
    var params = {};
    params.assignmentId = getParameterByName('assignmentId');
    params.workerId = getParameterByName('workerId');
    params.hitId = getParameterByName('hitId');
    params.turkSubmitTo = getParameterByName('turkSubmitTo');
    return params;
}

var globalStore = {};
$(document).ready(function () {
    loadFigerHier();
    loadDocument();
    globalStore.mTurkParams = getMTurkParams();
    globalStore.preview_id = 'ASSIGNMENT_ID_NOT_AVAILABLE';
});
