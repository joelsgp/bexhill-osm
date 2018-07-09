// parse tags and marker popup

function parse_tags(element, titlePopup, functions) {
	var markerPopup = generic_header_parser(titlePopup, (element.tags.name || element.tags.ref), element.tags['fhrs:id']);
	markerPopup += '<a class="popup-direct" title="Walking directions"><i class="fas fa-walking fa-fw"></i></a>';
	markerPopup += '<a id="' + element.type + '_' + element.id + '" class="popup-edit" title="Edit with OpenStreetMap"><i class="fas fa-edit fa-fw"></i></a>';
	functions = [
		{callback: generic_tag_parser, tag: 'official_name', label: 'Official name'},
		{callback: generic_tag_parser, tag: 'loc_name', label: 'Local name'},
		{callback: generic_tag_parser, tag: 'alt_name', label: 'Alternative name'},
		{callback: generic_tag_parser, tag: 'old_name', label: 'Old name'},
		{callback: generic_tag_parser, tag: 'operator', label: 'Operator', iconName: 'fas fa-user-tie'},
		{callback: address_parser},
		{callback: phone_parser},
		{callback: website_parser},
		{callback: contact_parser},
		{callback: wikipedia_parser},
		{callback: listed_parser},
		{callback: generic_tag_parser, tag: 'opening_date', label: 'Opening date', iconName: 'fas fa-calendar-alt'},
		{callback: generic_tag_parser, tag: 'end_date', label: 'End date', iconName: 'fas fa-calendar-alt'},
		{callback: generic_tag_parser, tag: 'access', label: 'Access', iconName: 'fas fa-sign-in-alt'},
		{callback: generic_tag_parser, tag: 'description', label: 'Description', iconName: 'fas fa-clipboard'},
		{callback: facility_parser},
		{callback: payment_parser},
		{callback: street_parser},
		{callback: furtherreading_parser}
	].concat(functions);
	for (var c = 0; c < functions.length; c++) {
		var data = functions[c];
		if (data.tag && data.label) {
			var iconName = data.iconName ? data.iconName : 'fas fa-tag';
			markerPopup += data.callback(element.tags, data.tag, data.label, iconName);
		}
		else markerPopup += data.callback(element.tags);
	}
	markerPopup += opening_hours_parser(element.tags);
	markerPopup += image_parser(element.tags);
	return markerPopup;
}

var spinner = 0, markerId, ohState, ctState, poiList = [];
function callback(data) {
	if ($('#inputDebug').is(':checked')) console.debug(data);
	var type, name, iconName, markerPopup;
	var customPOptions = {
		maxWidth: imgSize,
		autoPanPaddingBottomRight: [5, 50]
	};
	var customTOptions = {
		direction: 'right',
		offset: [15, 2]
	};
	// padding so popup is not obfuscated by map controls
	customPOptions.autoPanPaddingTopLeft = ($(window).width() < 768 || !rQuery) ? [20, 40] : [sidebar.width() + 50, 5];
	// push data to results list
	var setPoiList = function () {
		// get openhrs colour
		marker.ohState = ohState;
		marker.ctState = ctState;
		// get distance if location on
		if (lc._active) marker.distance = map.distance(lc._event.latlng, marker._origLatlng);
		// get facilities from popup
		marker.facilities = $('.popup-facilities', $(markerPopup))[0] ? $('.popup-facilities', $(markerPopup))[0].innerHTML : '';
		poiList.push(marker);
	};
	for (var c in data.elements) {
		var e = data.elements[c];
		// check tags exist
		if (!e.tags || e.id in this.instance._ids) continue;
		this.instance._ids[e.id] = true;
		var pos = (e.type === 'node') ? new L.LatLng(e.lat, e.lon) : new L.LatLng(e.center.lat, e.center.lon);
		// get and display the area outline through openstreetmap api
		if (e.type !== 'node') getOsmOutline(e.type, e.id);
		name = type = iconName = ohState = ctState = undefined;
		if (e.tags.construction && e.tags.ref) {
			name = e.tags.construction + ' construction';
			type = 'construction';
		}
		if (e.tags.amenity) {
			if (!name) name = e.tags.amenity;
			if (!type) type = e.tags.amenity;
			switch (e.tags.amenity) {
				case 'animal_boarding' : type = 'animal_shelter'; break;
				case 'arts_centre' : type = 'attraction'; iconName = 'theater'; break;
				case 'cafe' :
				case 'fast_food' :
				case 'restaurant' :
					if (e.tags.cuisine) {
						name = e.tags.cuisine;
						if (e.tags.amenity === 'restaurant' && e.tags.takeaway === 'only') name += ' takeaway';
						else name += ' ' + e.tags.amenity;
						switch (e.tags.cuisine) {
							case 'chinese' : iconName = 'restaurant_chinese'; break;
							case 'fish_and_chips' : iconName = 'fishchips'; break;
							case 'ice_cream' : iconName = 'icecream'; break;
							case 'indian' : iconName = 'restaurant_indian'; break;
							case 'italian' : iconName = 'restaurant_italian'; break;
							case 'kebab' : iconName = 'kebab'; break;
							case 'latin_american' :
							case 'mexican' : iconName = 'restaurant_mexican'; break;
							case 'pizza' : iconName = 'pizzaria'; break;
							case 'seafood' : iconName = 'restaurant_fish'; break;
							case 'spanish' : iconName = 'restaurant_tapas'; break;
							case 'steak_house' : iconName = 'restaurant_steakhouse'; break;
							case 'thai' : iconName = 'restaurant_thai'; break;
							case 'vegetarian' : iconName = 'restaurant_vegetarian'; break;
						}
					}
					break;
				case 'clock' :
					type = 'clock';
					if (e.tags.display === 'sundial') {
						name = e.tags.display;
						iconName = 'sundial';
					}
					else if (e.tags.display) name = e.tags.display + ' ' + e.tags.amenity;
					break;
				case 'social_centre' : if (e.tags.club) name = e.tags.club + ' club'; break;
				case 'fire_station' : type = 'police'; iconName = 'firetruck'; break;
				case 'place_of_worship' : if (e.tags.religion) name = e.tags.religion; break;
				case 'nightclub' : type = 'bar'; break;
				case 'post_box' : name = (e.tags['post_box:type'] || '') + ' ' + name; break;
				case 'post_office' : type = 'post_box'; iconName = 'postoffice'; break;
				case 'pub' : if (e.tags.microbrewery) name = 'Microbrewery'; break;
				case 'recycling' :
					if (e.tags.recycling_type) {
						name = e.tags.amenity + ' ' + e.tags.recycling_type;
						if (e.tags.recycling_type === 'container') iconName = 'recyclecon';
					}
					break;
				case 'retirement_home' :
				case 'social_facility' :
					type = 'social_facility';
					name = e.tags.social_facility;
					if (e.tags['social_facility:for']) name = e.tags['social_facility:for'] + ' ' + name; 
					break;
				case 'taxi' : if (!e.tags.building) { name = e.tags.amenity + ' rank'; iconName = 'taxirank'; } break;
			}
		}
		if (e.tags.highway) {
			iconName = 'roadtype_tar';
			switch (e.tags.highway) {
				case 'bus_stop' : iconName = 'busstop'; type = 'bus_stop'; break;
				case 'footway' :
				case 'path' :
				case 'track' :
				case 'pedestrian' : iconName = 'roadtype_track'; break;
				case 'speed_camera' : type = 'surveillance'; break;
			}
		}
		if (e.tags.historic) {
			if (!name) name = 'historic ' + e.tags.historic;
			if (!type) type = 'historic';
			if (e.tags.ruins) iconName = 'ruins-2';
			if (e.tags.military) {
				iconName = 'war';
				switch (e.tags.military) {
					case 'bunker' : iconName = 'bunker'; break;
					case 'barrier' : iconName = 'tanktrap'; break;
				}
			}
			switch (e.tags.historic) {
				case 'beacon' : iconName = 'landmark'; break;
				case 'boundary_stone' : iconName = pois.boundary_stone.iconName; break;
				case 'memorial' :
					if (e.tags.memorial) {
						name = 'memorial ' + e.tags.memorial;
						if (!iconName) {
							switch (e.tags.memorial) {
								case 'blue_plaque' :
								case 'plaque' : iconName = 'plaque'; break;
								case 'clock' : iconName = 'clock'; break;
								case 'statue' : iconName = 'statue-2'; break;
								case 'war_memorial' : name = 'war memorial'; iconName = 'war_memorial'; break;
							}
						}
					}
					if (!iconName) iconName = 'memorial';
					break;
				case 'moat' : iconName = 'lake2'; break;
				case 'railway_station' : iconName = 'steamtrain'; break;
				case 'street_lamp' : iconName = 'streetlamp'; break;
				case 'wreck' : iconName = 'shipwreck'; break;
				case 'watering_place' : iconName = 'wateringplace'; break;
			}
		}
		if (e.tags.man_made) {
			if (!name) name = e.tags.man_made;
			if (!type) type = e.tags.man_made;
			if (type === 'survey_point') {
				name = e.tags.survey_point;
				switch (e.tags.survey_point) {
					case 'triangulation_station' : iconName = 'sppillar'; break;
					case 'flush_bracket' : iconName = 'spbracket'; break;
					case 'pivot' :
					case 'rivet' : iconName = 'sprivet'; break;
				}
			}
		}
		if (e.tags.natural) {
			if (!name) name = e.tags.natural;
			if (!type) type = e.tags.natural;
			if (type === 'peak') iconName = 'hill';
		}
		if (e.tags.shop) {
			if (!name) name = e.tags.shop;
			if (!type) type = e.tags.shop;
			switch (e.tags.shop) {
				case 'beauty' : if (e.tags.beauty) name = e.tags.beauty + ' ' + e.tags.shop; break;
				case 'bathroom_furnishing' :
				case 'interior_decoration' :
				case 'kitchen' : type = 'houseware'; break;
				case 'butcher' : type = 'deli'; iconName = 'butcher-2'; break;
				case 'boutique' : type = 'clothes'; break;
				case 'collector' : type = 'games'; break;
				case 'craft' : if (e.tags.craft) name = e.tags.craft; break;
				case 'department_store' : type = 'clothes'; iconName = 'departmentstore'; break;
				case 'e-cigarette' : type = 'tobacco'; break;
				case 'garden_centre' : type = 'florist'; break;
				case 'hairdresser' :
					if (e.tags.male === 'yes') { name = 'male barber'; iconName = 'hairmale'; }
					else if (e.tags.female === 'yes') { name = 'female hairdresser'; iconName = 'hairfemale'; }
					else if (e.tags.unisex === 'yes') name = 'unisex hairdresser';
					break;
				case 'hardware' : type = 'doityourself'; break;
				case 'hearing_aids' : type = 'mobility'; iconName = 'hoergeraeteakustiker_22px'; break;
				case 'laundry' : type = 'dry_cleaning'; break;
				case 'signs' : type = 'copyshop'; break;
				case 'trade' : if (e.tags.trade) name = e.tags.trade + ' ' + e.tags.shop; break;
				case 'window_blind' : type = 'curtain'; break;
			}
		}
		if (e.tags.tourism) {
			if (!name) name = e.tags.tourism;
			if (!type) type = e.tags.tourism;
			switch (e.tags.tourism) {
				case 'artwork' : if (e.tags.artwork_type) name = e.tags.artwork_type + ' ' + e.tags.tourism; break;
				case 'gallery' : type = 'artwork'; iconName = 'museum_paintings'; break;
				case 'hotel' : type = 'guest_house'; iconName = 'hotel_0star'; break;
				case 'information' :
					if (e.tags.information) {
						name = e.tags.tourism + ' ' + e.tags.information;
						switch (e.tags.information) {
							case 'board' : iconName = 'board'; break;
							case 'guidepost' : iconName = 'signpost-3'; name = e.tags.tourism + ' ' + e.tags.information; break; // [ascii 255] force to bottom of results
							case 'map' : iconName = 'map'; break;
							case 'office' : name = ' ' + name; break; // [ascii 32] force to top of results
						}
					}
					break;
			}
		}
		if (e.tags.landuse) {
			if (!name) name = e.tags.landuse;
			if (!type) type = e.tags.landuse;
		}
		if (e.tags.leisure) {
			if (!name) name = e.tags.leisure;
			if (!type) type = e.tags.leisure;
			switch (type) {
				case 'common' :
				case 'nature_reserve' : type = 'park'; break;
				case 'fitness_station' : type = 'fitness_centre'; break;
				case 'garden' : iconName = 'urbanpark'; break;
				case 'sport' : if (e.tags.sport) name = e.tags.sport + ' ' + e.tags.leisure; break;
				case 'golf_course': type = 'recreation_ground'; iconName = 'golfing'; break;
			}
		}
		if (e.tags.emergency) {
			if (!name) name = e.tags.emergency;
			if (!type) type = e.tags.emergency;
			if (type === 'ambulance_station') { type = 'police'; iconName = 'ambulance'; }
		}
		if (e.tags.office) {
			if (!name) name = e.tags.office + ' office';
			if (!type) type = e.tags.office;
			// group similar pois
			if (type === 'financial') type = 'accountant';
		}
		if (e.tags.healthcare) {
			if (!name && e.tags['healthcare:speciality']) name = e.tags['healthcare:speciality'];
			else if (!name) name = e.tags.healthcare;
			if (!type) type = 'healthcare';
		}
		if (e.tags.listed_status) {
			if (!type || type === 'shelter' || type === 'company') type = 'listed_status';
		}
		if (e.tags.route === 'bus') {
			type = e.tags.route;
			name = e.tags.route + ' route';
		}
		if (e.tags.boundary) {
			if (!name) name = e.tags.protection_title;
			if (!type) type = e.tags.boundary;
		}
		if (e.tags.place) {
			name = e.tags.place;
			iconName = 'smallcity';
		}
		// set marker options
		customPOptions.minWidth = (e.tags.image || e.tags.wikimedia_commons) ? imgSize : '';
		var poi = pois[type];
		if (!iconName) {
			if (poi) iconName = poi.iconName;
			else if (e.tags.building) {
				if (e.tags.building === 'house' || e.tags.building === 'bungalow') iconName = 'bighouse';
				else if (e.tags.building === 'hut') iconName = 'hut';
				else if (e.tags.building === 'service') iconName = 'powersubstation';
				else iconName = 'apartment-3';
			}
			else iconName = '000blank';
		}
		var marker = L.marker(pos, {
			// do not bounce marker: when single poi, in debug mode, on small devices
			bounceOnAdd: (!rQuery && !$('#inputDebug').is(':checked') && $(window).width() >= 768),
			bounceOnAddOptions: {duration: 500, height: 200},
			icon: L.icon({
				iconUrl: 'assets/img/icons/' + iconName + '.png',
				iconSize: [32, 37],
				iconAnchor: [16, 35],
				shadowUrl: 'assets/img/icons/000shadow.png',
				shadowAnchor: [16, 27],
				popupAnchor: [0, -27]
			}),
			keyboard: false,
			riseOnHover: true
		});
		// find alternative poi name
		if (!name || (poi && name === poi.name.toLowerCase())) {
			if (poi) name = poi.name;
			else if (e.tags.highway) name = (e.tags.highway === 'bus_stop') ? e.tags.highway : e.tags.highway + ' highway';
			else if (e.tags.railway) name = 'railway ' + e.tags.railway;
			else if (e.tags.ref) name = e.tags.ref;
			else if (e.tags.building && e.tags.building !== 'yes') name = e.tags.building;
			else if (e.tags['addr:housename']) name = e.tags['addr:housename'];
			else name = '&hellip;';
		}
		if (name != '&hellip;') name = titleCase(name);
		marker._leaflet_id = e.type.slice(0, 1) + e.id;
		// tooltip
		customTOptions.permanent = poi ? poi.permTooltip : 0;
		var toolTip = '<b>' + name + '</b>';
		if (e.tags.name) toolTip += '<br><i>' + e.tags.name + '</i>';
		else if (e.tags['addr:street'])  {
			if (e.tags['addr:housename']) toolTip += '<br><i>' + e.tags['addr:housename'] + ', ' + e.tags['addr:street'] + '</i>';
			else if (e.tags['addr:housenumber']) toolTip += '<br><i>' + e.tags['addr:housenumber'] + ' ' + e.tags['addr:street'] + '</i>';
			else if (e.tags['addr:unit']) toolTip += '<br><i>Unit ' + e.tags['addr:unit'] + ', ' + e.tags['addr:street'] + '</i>';
			else toolTip += '<br><i>' + e.tags['addr:street'] + '</i>';
		}
		else if (e.tags['addr:place']) toolTip += '<br><i>' + e.tags['addr:place'] + '</i>';
		else if (e.tags.ref) toolTip += '<br><i>' + e.tags.ref + '</i>';
		else if (e.tags.operator) toolTip += '<br><i>' + e.tags.operator + '</i>';
		if ((e.tags.image || e.tags.wikimedia_commons) && !$('#inputImage').is(':checked')) {
			toolTip += ' <i style="color:#777; min-width:17px;" class="fas ';
			toolTip += (e.tags.image_1) ? 'fa-images' : 'fa-image';
			toolTip += ' fa-fw"></i>';
			if (e.tags['image:360']) toolTip += ' <i style="color:#777; min-width:17px;" class="fa fa-street-view fa-fw"></i>';
		}
		// check if already defined poi
		if (poi) {
			// create pop-up
			markerPopup = poi.tagParser ? poi.tagParser(e, name) : generic_poi_parser(e, name);
			customTOptions.className = ohState !== undefined ? 'openColor-list-' + ohState : 'openColor-list-' + ctState;
			// show pop-up
			marker.bindPopup(markerPopup, customPOptions);
			marker.bindTooltip(toolTip, customTOptions);
			if (rQuery) {
				marker.addTo(this.instance);
				if (rQuery === 'sclick') marker.openTooltip();
				else marker.openPopup();
				markerId = marker._leaflet_id;
			}
			// marker from group poi
			// check for facilities on 'currently open' setting
			else if (!$('#inputOpen').is(':checked') || ($('#inputOpen').is(':checked') && ohState === true)) {
				marker.addTo(this.instance);
				setPoiList();
			}
		}
		else if (rQuery) {
			// single generic marker
			markerPopup = generic_poi_parser(e, name);
			customTOptions.className = ohState !== undefined ? 'openColor-list-' + ohState : 'openColor-list-' + ctState;
			marker.bindPopup(markerPopup, customPOptions);
			marker.bindTooltip(toolTip, customTOptions);
			marker.addTo(this.instance);
			if (rQuery === 'sclick') marker.openTooltip();
			else marker.openPopup();
			markerId = marker._leaflet_id;
		}
		else if ($('#inputDebug').is(':checked')) {
			// custom overpass query
			markerPopup = generic_poi_parser(e, name);
			customTOptions.className = ohState !== undefined ? 'openColor-list-' + ohState : 'openColor-list-' + ctState;
			marker.bindPopup(markerPopup, customPOptions);
			marker.bindTooltip(toolTip, customTOptions);
			marker.addTo(this.instance);
			setPoiList();
		}
		rQuery = false;
	}
	// output list of pois in sidebar
	if (poiList.length) {
		// sort by distance or name
		poiList.sort(function (a, b) {
			if (a.distance) return (a.distance > b.distance) ? 1 : -1;
			else return (a._tooltip._content > b._tooltip._content) ? 1 : -1;
		});
		$('.poi-results').slideDown(200);
		if ($(window).width() < 768) $('#btnPoiResultsClear').show();
		var poiResultsList = '<table>';
		for (c = 0; c < poiList.length; c++) {
			var state = poiList[c].ohState !== undefined ? poiList[c].ohState : poiList[c].ctState;
			poiResultsList += '<tr id="' + c + '">' +
				'<td class="openColor-list-' + state + '"><img src="' + poiList[c]._icon.src + '"></td>' +
				'<td>' + poiList[c]._tooltip._content + '</td>' +
				'<td>' + poiList[c].facilities + '</td>';
			if (poiList[c].distance) {
				if ($('#inputUnit').is(':checked')) {
					if (poiList[c].distance < 1000) poiResultsList += '<td>' + Math.round(poiList[c].distance) + ' m</td>';
					else poiResultsList += '<td>' + Math.round((poiList[c].distance / 1000) * 100) / 100 + ' km</td>';
				}
				else {
					if (poiList[c].distance < 800) poiResultsList += '<td>' + Math.round(poiList[c].distance / 0.9144) + ' yd</td>';
					else poiResultsList += '<td>' + Math.round((poiList[c].distance / 1609.34) * 100) / 100 + ' mi</td>';
				}
			}
			poiResultsList += '</tr>';
		}
		poiResultsList += '</table>';
		$('.poi-results-list').html(poiResultsList);
		// interact with map
		$('.poi-results-list tr').hover(
			function () { poiList[this.id].openTooltip(); },
			function () { if (!poiList[this.id]._tooltip.options.permanent) poiList[this.id].closeTooltip(); }
		);
		$('.poi-results-list tr').click(function () {
			if ($(window).width() < 768) sidebar.close();
			else map.flyTo(poiList[this.id]._latlng);
			poiList[this.id].closePopup().openPopup();
		});
		if (poiList[0].distance) $('.poi-results h3').html($('.leaflet-marker-icon').length + ' results <i style="color:#777;" class="fas fa-sort-numeric-down fa-fw"></i>');
		else $('.poi-results h3').html($('.leaflet-marker-icon').length + ' results <i style="color:#777;" class="fas fa-sort-alpha-down fa-fw"></i>');
		if (poiList.length === maxOpResults) $('.poi-results h3').append('<br>(too many results to show)');
	}
	if (spinner > 0) spinner--;
	if (spinner === 0) {
		$('#spinner').fadeOut(200);
		$('.poi-checkbox').removeClass('poi-loading');
	}
}

// templates
function generic_header_parser(header, subheader, fhrs) {
	var markerPopup = '<div class="popup-header"><h3>' + header + '</h3>';
	if (subheader) markerPopup += '<span class="popup-header-sub">' + subheader + '</span>';
	if (fhrs) markerPopup += '<span class="popup-fhrs" fhrs-key="' + fhrs + '"><img title="Loading hygiene rating..." src="assets/img/loader.gif"></span>';
	return markerPopup + '</div>';
}
var tagTmpl = '<div class="popup-tagContainer"><i class="popup-tagIcon {iconName} fa-fw"></i><span class="popup-tagValue"><strong>{tag}:</strong> {value}</span></div>';
function generic_tag_parser(tags, tag, label, iconName) {
	var markerPopup = '', result;
	// ignore implied access
	if (tags[tag] && tag === 'access' && tags[tag] === 'yes') return markerPopup;
	else if (tags[tag]) {
		if (tags[tag] === 'yes') result = '<i class="fas fa-check fa-fw"></i>';
		else if (tags[tag] === 'no') result = '<i class="fas fa-times fa-fw"></i>';
		else if (tag.indexOf('_date') > -1 || tag.indexOf('date_') > -1) result = date_parser(tags[tag], 'long');
		else result = tags[tag].replace(/;/g, ', ').replace(/_/g, ' ');
		markerPopup += L.Util.template(tagTmpl, { tag: label, value: result, iconName: iconName });
	}
	return markerPopup;
}
function generic_img_parser(img, id, display, attrib) {
	var url = '', imgTmpl = '<div id="img{id}" class="popup-imgContainer" style="display:{display};">' +
		'<img data-url="{url}" alt="Loading image..." style="max-height:{maxheight}px;" src="{img}">' + 
		'<br><div class="popup-imgAttrib">';
	if (img.indexOf('File') === 0) {
		url = img;
		attrib = 'Loading attribution...';
		img = 'https://commons.wikimedia.org/w/thumb.php?f=' + encodeURIComponent(img.split(':')[1]) + '&w=' + imgSize;
		imgTmpl += '{attrib}';
	}
	else {
		if (attrib) imgTmpl += '&copy; {attrib} | ';
		imgTmpl += '<a onclick="$(img{id}).dblclick();">Full Image</a>';
	}
	imgTmpl += '</div></div>';
	return L.Util.template(imgTmpl, { id: id, display: display, url: url, maxheight: imgSize / 2, img: img, attrib: attrib });
}
function show_img_controls(imgMax, img360) {
	var ctrlTmpl = '<div class="navigateItem">';
	if (img360 && img360.indexOf('File') === 0) ctrlTmpl +=
		'<a title="360 Panorama" onclick="nav360(&quot;' + img360 + '&quot;)">' +
		'<i style="min-width:25px" class="fas fa-street-view fa-fw jump"></i></a>';
	if (imgMax > 1) ctrlTmpl +=
		'<span class="theme navigateItemPrev"><a title="Previous image" onclick="navImg(0);"><i class="fas fa-caret-square-left fa-fw"></i></a></span>' +
		'<i class="fas fa-image fa-fw" title="1 of ' + imgMax + '"></i>' +
		'<span class="theme navigateItemNext"><a title="Next image" onclick="navImg(1);"><i class="fas fa-caret-square-right fa-fw"></i></a></span>';
	return ctrlTmpl + '</div>';
}
function generic_poi_parser(tags, titlePopup) {
	// used if poi has no parser
	return parse_tags(tags, titlePopup, [] );
}

// global callback parsers
function address_parser(tags) {
	var markerPopup = '';
	if (tags['addr:street'] || tags['addr:place']) {
		var value = '';
		if (tags['addr:housename'] && tags['addr:housename'] !== tags.name) value += tags['addr:housename'] + ', ';
		if (tags['addr:flats']) value += 'Flats: ' + tags['addr:flats'] + ', ';
		if (tags['addr:unit']) value += 'Unit ' + tags['addr:unit'] + ', ';
		if (tags['addr:housenumber']) value += tags['addr:housenumber'] + ' ';
		if (tags['addr:street']) value += tags['addr:street'];
		else if (tags['addr:place']) value += tags['addr:place'];
		if (tags['addr:suburb']) value += ', ' + tags['addr:suburb'];
		else if (tags['addr:hamlet']) value += ', ' + tags['addr:hamlet'];
		if (tags['addr:city'] && tags['addr:city'] !== 'Bexhill') value += ', ' + tags['addr:city'];
		if (tags['addr:postcode']) value += ', ' + tags['addr:postcode'];
		markerPopup += L.Util.template(tagTmpl, { tag: 'Address', value: value, iconName: 'fas fa-map-marker' });
	}
	return markerPopup;
}
function phone_parser(tags) {
	var tagPhone = tags.phone ? tags.phone : tags['contact:phone'];
	var markerPopup = '';
	if (tagPhone) {
		tagPhone = tagPhone.replace('+44 ', '0');
		var link = '<a href="tel:' + tagPhone + '" title="Call now">' + tagPhone + '</a>';
		markerPopup += L.Util.template(tagTmpl, { tag: 'Phone', value: link, iconName: 'fas fa-phone' });
	}
	return markerPopup;
}
function website_parser(tags) {
	var markerPopup = '';
	var tagWebsite = tags.website ? tags.website : tags['contact:website'];
	if (tagWebsite) {
		var link = '<a class="popup-truncate" style="max-width:' + (imgSize - 100) + 'px" href="' + tagWebsite + '" title="' + tagWebsite + '" target="_blank">' + tagWebsite + '</a>';
		markerPopup += L.Util.template(tagTmpl, { tag: 'Website', value: link, iconName: 'fas fa-globe' });
	}
	return markerPopup;
}
function contact_parser(tags) {
	var markerPopup = '', tag = '';
	var tagMail = tags.email ? tags.email : tags['contact:email'];
	var tagFb = tags.facebook ? tags.facebook : tags['contact:facebook'];
	var tagTwit = tags.twitter ? tags.twitter : tags['contact:twitter'];
	if (tagMail) tag += '<a href="mailto:' + tagMail + '"><i class="fas fa-envelope fa-fw" title="E-mail: ' + tagMail + '"></i></a> ';
	if (tagFb) tag += '<a href="' + tagFb + '" target="_blank"><i class="fab fa-facebook fa-fw" title="Facebook: ' + tagFb + '" style="color:#3b5998;"></i></a> ';
	if (tagTwit) tag += '<a href="https://twitter.com/' + tagTwit + '" target="_blank"><i class="fab fa-twitter fa-fw" title="Twitter: @' + tagTwit + '" style="color:#1da1f2;"></i></a> ';
	if (tag) markerPopup += L.Util.template(tagTmpl, { tag: 'Contact', value: tag, iconName: 'fas fa-user-circle' });
	return markerPopup;
}
function wikipedia_parser(tags) {
	var wikipedia = tags.wikipedia ? tags.wikipedia : tags['site:wikipedia'];
	var markerPopup = '';
	if (wikipedia) {
		var s = wikipedia.split(':');
		var lang = s[0] + '.', subject = s[1];
		var href = 'https://' + lang + 'wikipedia.org/wiki/' + subject;
		var link = '<a class="popup-truncate" style="max-width:' + (imgSize - 100) + 'px" href="' + href + '" title="' + subject + '" target="_blank">' + subject + '</a>';
		markerPopup += L.Util.template(tagTmpl, { tag: 'Wikipedia', value: link, iconName: 'fab fa-wikipedia-w' });
	}
	return markerPopup;
}
function listed_parser(tags) {
	var tag = '', label = '', markerPopup = '', icon = '';
	if (tags.building) {
		label = 'Building';
		icon = 'fas fa-building';
		if (tags['building:architecture']) tag += titleCase(tags['building:architecture']) + '; ';
		if (tags.architect) tag += tags.architect + '; ';
		if (tags.start_date) tag += date_parser(tags.start_date, 'short') + '; ';
	}
	else {
		label = 'Listed';
		icon = 'fas fa-file';
		if (tags.start_date) markerPopup += L.Util.template(tagTmpl, { tag: 'Start date', value: date_parser(tags.start_date, 'long'), iconName: 'fas fa-calendar-alt' });
		if (tags.architect) markerPopup += L.Util.template(tagTmpl, { tag: 'Architect', value: tags.architect, iconName: 'fas fa-user' });
	}
	if (tags.HE_ref) {
		var listedStatus = tags.listed_status ? tags.listed_status : tags.HE_ref;
		tag += '<a href="https://historicengland.org.uk/listing/the-list/list-entry/' + tags.HE_ref + '" title="Historic England entry" target="_blank">' + listedStatus + '</a>; ';
	}
	if (tag) markerPopup = L.Util.template(tagTmpl, { tag: label + ' details', value: tag, iconName: icon }) + markerPopup;
	return markerPopup;
}
function facility_parser(tags) {
	var markerPopup = '', tag = '';
	if (tags.wheelchair === 'yes') tag += '<i class="fas fa-wheelchair fa-fw" title="wheelchair: yes" style="color:darkgreen;"></i>';
	else if (tags.wheelchair === 'limited') tag += '<i class="fas fa-wheelchair fa-fw" title="wheelchair: limited" style="color:olive;"></i>';
	else if (tags.wheelchair === 'no') tag += '<i class="fas fa-wheelchair fa-fw" title="wheelchair: no" style="color:red;"></i>';
	if (tags.dog === 'yes') tag += '<i class="fas fa-paw fa-fw" title="dog: yes" style="color:darkgreen;"></i>';
	else if (tags.dog === 'no') tag += '<i class="fas fa-paw fa-fw" title="dog: no" style="color:red;"></i>';
	if (tags.internet_access === 'wlan') tag += '<i class="fas fa-wifi fa-fw" title="wireless internet access" style="color:darkgreen;"></i>';
	else if (tags.internet_access === 'terminal') tag += '<i class="fas fa-desktop fa-fw" title="terminal internet access" style="color:darkgreen;"></i>';
	if (tags.amenity === 'toilets') {
		if (tags.male === 'yes' || tags.unisex === 'yes') tag += '<i class="fas fa-male fa-fw" title="male: yes" style="color:darkgreen;"></i>';
		if (tags.female === 'yes' || tags.unisex === 'yes') tag += '<i class="fas fa-female fa-fw" title="female: yes" style="color:darkgreen;"></i>';
		if (tags.diaper === 'yes') tag += '<i class="fas fa-child fa-fw" title="baby changing: yes" style="color:darkgreen;"></i>';
	}
	if (tag) markerPopup += L.Util.template(tagTmpl, { tag: 'Facilities', value: '<span class="popup-facilities">' + tag + '</span>', iconName: 'fas fa-info-circle' });
	return markerPopup;
}
function payment_parser(tags) {
	var markerPopup = '', tag = '';
	for (var key in tags) {
		if (key.indexOf('payment:') === 0 && tags[key] === 'yes') tag += key.split(':')[1] + ', ';
	}
	if (tag) {
		tag = tag.replace(/_/g, '-');
		tag = tag.substring(0, tag.length - 2);
		markerPopup += L.Util.template(tagTmpl, { tag: 'Payment options', value: tag, iconName: 'fas fa-coins' });
	}
	return markerPopup;
}
function street_parser(tags) {
	var markerPopup = '';
	if (tags.highway && tags.name) {
		// get street history through xml file lookup
		$.ajax({
			async: false,
			url: 'assets/xml/streetnames.xml',
			dataType: 'xml',
			success: function (xml) {
				var street = $(xml).find('name').filter(function () {
					return $(this).text() === tags.name;
				}).closest('street');
				var streetDate = $('date', street).text();
				var streetDesc = $('desc', street).text();
				if (streetDate && !tags.start_date) markerPopup += L.Util.template(tagTmpl, { tag: 'Start date', value: streetDate, iconName: 'fas fa-calendar-alt' });
				if (streetDesc) markerPopup += '<span class="popup-longDesc">' + L.Util.template(tagTmpl, { tag: 'Street history', value: streetDesc, iconName: 'fas fa-road' }) + '</span>';
				if (markerPopup) {
					var sourceLink = $(xml).find('source').text();
					var sourceAuthor = $(xml).find('author').text();
					markerPopup += '<span class="popup-streetSource"><a href="' + sourceLink + '" target="_blank" title="' + sourceLink + '">&copy; ' + sourceAuthor + '</a></span>';
				}
			}
		});
		if (tags.maxspeed) markerPopup += L.Util.template(tagTmpl, { tag: 'Max speed', value: tags.maxspeed, iconName: 'fas fa-tachometer-alt' });
		if (tags.maxwidth) markerPopup += L.Util.template(tagTmpl, { tag: 'Max width', value: tags.maxwidth, iconName: 'fas fa-car' });
	}
	return markerPopup;
}
function furtherreading_parser(tags) {
	var tag = '', markerPopup = '';
	if (tags['url:bexhillhistorytrail']) {
		tag += '<a href="' + tags['url:bexhillhistorytrail'] + '" title="The Bexhill History Trail" target="_blank">History Trail</a>; ';
	}
	if (tags['ref:thekeep']) {
		tag += '<a href="http://www.thekeep.info/collections/getrecord/' + tags['ref:thekeep'] + '" title="The Keep record" target="_blank">The Keep</a>; ';
	}
	if (tag) markerPopup = L.Util.template(tagTmpl, { tag: 'Futher reading', value: tag, iconName: 'fas fa-book' });
	return markerPopup;
}

// poi callback parsers
function allotment_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'user', label: 'Point of contact', iconName: 'fas fa-user-circle'},
		{callback: generic_tag_parser, tag: 'plots', label: 'Plots', iconName: 'fas fa-th-large'},
	]);
}
function artwork_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'artwork_type', label: 'Artwork type', iconName: 'fas fa-paint-brush'},
		{callback: generic_tag_parser, tag: 'artist_name', label: 'Artist', iconName: 'far fa-user'},
		{callback: generic_tag_parser, tag: 'material', label: 'Material', iconName: 'fas fa-cube'}
	]);
}
function atm_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'brand', label: 'Brand'},
		{callback: generic_tag_parser, tag: 'indoor', label: 'Enter building to access', iconName: 'fas fa-sign-in-alt'},
		{callback: generic_tag_parser, tag: 'fee', label: 'Fee', iconName: 'fas fa-coins'}
	]);
}
function bikepark_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'bicycle_parking', label: 'Type', iconName: 'fas fa-lock'},
		{callback: generic_tag_parser, tag: 'capacity', label: 'Capacity', iconName: 'fas fa-bicycle'},
		{callback: generic_tag_parser, tag: 'covered', label: 'Covered', iconName: 'fas fa-umbrella'}
	]);
}
function bikeshop_parser(tags, titlePopup) {
	var bikeservices_parser = function (tags) {
		var markerPopup = '', tag = '';
		for (var key in tags) {
			if (key.indexOf('service:bicycle:') === 0 && (tags[key] === 'yes')) tag += key.split(':')[2] + ', ';
		}
		if (tag) {
			tag = tag.replace(/_/g, '-');
			tag = tag.substring(0, tag.length - 2);
			markerPopup += L.Util.template(tagTmpl, { tag: 'Bicycle services', value: tag, iconName: 'fas fa-bicycle' });
		}
		return markerPopup;
	};
	return parse_tags(tags, titlePopup,	[
		{callback: bikeservices_parser}
	]);
}
function busstop_parser(tags, titlePopup) {
	var facility_parser = function (tags) {
		var markerPopup = '', tag = '';
		if (tags.shelter === 'yes') tag += 'shelter, ';
		if (tags.bench === 'yes') tag += 'bench, ';
		if (tags.bin === 'yes') tag += 'rubbish bin, ';
		if (tags.wheelchair === 'yes') tag += 'wheelchair accessible, ';
		if (tag) {
			tag = tag.replace(/_/g, '-');
			tag = tag.substring(0, tag.length - 2);
			markerPopup += L.Util.template(tagTmpl, { tag: 'Facilities', value: tag, iconName: 'fas fa-info-circle' });
		}
		return markerPopup;
	};
	var nextbus_parser = function (tags) {
		var markerPopup = '';
		if (tags['naptan:AtcoCode']) markerPopup += '<div class="popup-bsTable" naptan-key="' + tags['naptan:AtcoCode'] + '"><img title="Loading next bus times" src="assets/img/loader.gif"></div>';
		return markerPopup;
	};
	return parse_tags(tags, titlePopup,	[
		{callback: generic_tag_parser, tag: 'ref', label: 'Stop ID', iconName: 'fas fa-bus'},
		{callback: generic_tag_parser, tag: 'naptan:Street', label: 'Street', iconName: 'fas fa-road'},
		{callback: generic_tag_parser, tag: 'naptan:Bearing', label: 'Bearing', iconName: 'fas fa-compass'},
		{callback: facility_parser},
		{callback: nextbus_parser}
	]);
}
function carpark_parser(tags, titlePopup) {
	var maxstay_parser = function (tags) {
		var markerPopup = '';
		if (tags.maxstay) markerPopup += L.Util.template(tagTmpl, { tag: 'Max stay', value: time_parser(tags.maxstay), iconName: 'fas fa-clock' });
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'capacity', label: 'Spaces', iconName: 'fas fa-car'},
		{callback: generic_tag_parser, tag: 'capacity:disabled', label: 'Disabled spaces', iconName: 'fas fa-wheelchair'},
		{callback: generic_tag_parser, tag: 'capacity:parent', label: 'Parent spaces', iconName: 'fas fa-child'},
		{callback: generic_tag_parser, tag: 'fee', label: 'Fee', iconName: 'fas fa-coins'},
		{callback: maxstay_parser}
	]);
}
function carshop_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'service', label: 'Services', iconName: 'fas fa-car'}
	]);
}
function cctv_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'highway', label: 'Type', iconName: 'fas fa-eye'},
		{callback: generic_tag_parser, tag: 'maxspeed', label: 'Max speed', iconName: 'fas fa-video'},
		{callback: generic_tag_parser, tag: 'surveillance:type', label: 'Type', iconName: 'fas fa-eye'},
		{callback: generic_tag_parser, tag: 'surveillance:zone', label: 'Zone', iconName: 'fas fa-eye'},
		{callback: generic_tag_parser, tag: 'camera:mount', label: 'Camera mount', iconName: 'fas fa-video'},
		{callback: generic_tag_parser, tag: 'camera:type', label: 'Camera type', iconName: 'fas fa-video'}
	]);
}
function clock_parser(tags, titlePopup) {
	var clockDetail = function (tags) {
		var markerPopup = '', tag = '';
		if (tags.disused === 'yes') tag += 'noncurrent, ';
		if (tags.display) tag += tags.display + ', ';
		if (tags.support) tag += tags.support + ', ';
		if (tags.faces >= 2) tag += tags.faces + ' faces, ';
		else tag += '1 face, ';
		if (tag) {
			tag = tag.replace(/_/g, '-');
			tag = tag.substring(0, tag.length - 2);
			markerPopup += L.Util.template(tagTmpl, { tag: 'Detail', value: tag, iconName: 'fas fa-clock' });
		}
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: clockDetail}
	]);
}
function clothes_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'clothes', label: 'Clothes type', iconName: 'fas fa-tshirt'},
		{callback: generic_tag_parser, tag: 'second_hand', label: 'Second hand', iconName: 'fas fa-tshirt'}
	]);
}
function club_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'club', label: 'Club type', iconName: 'fas fa-comments'},
		{callback: generic_tag_parser, tag: 'sport', label: 'Sport type', iconName: 'fas fa-trophy'}
	]);
}
function construction_parser(tags, titlePopup) {
	var planningRef = function (tags) {
		var markerPopup = '';
		if (tags.ref && tags.ref.indexOf('RR/') === 0) {
			var link = '<a href="http://planweb01.rother.gov.uk/OcellaWeb/planningDetails?reference=' + tags.ref + '" title="Rother Planning Application" target="_blank">' + tags.ref + '</a>';
			markerPopup += L.Util.template(tagTmpl, { tag: 'Planning ref', value: link, iconName: 'fas fa-file' });
		}
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: planningRef}
	]);
}
function craft_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'craft', label: 'Craft type', iconName: 'fas fa-shopping-bag'}
	]);
}
function defib_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'defibrillator:location', label: 'Location', iconName: 'fas fa-location-arrow'},
		{callback: generic_tag_parser, tag: 'indoor', label: 'Enter building to access', iconName: 'fas fa-sign-in-alt'}
	]);
}
function food_parser(tags, titlePopup) {
	var cuisine_parser = function (tags) {
		var markerPopup = '', tag = '';
		if (tags.cuisine) tag += tags.cuisine + ', ';
		if (tags.fair_trade === 'yes') tag += 'fairtrade, ';
		if (tags.breakfast === 'yes') tag += 'breakfast, ';
		if (tags.lunch === 'yes') tag += 'lunch, ';
		if (tags.ice_cream === 'yes') tag += 'ice cream, ';
		if (tags.real_ale === 'yes') tag += 'real ale, ';
		if (tags.real_cider === 'yes') tag += 'real cider, ';
		for (var key in tags) {
			if (key.indexOf('diet:') === 0 && (tags[key] === 'yes')) tag += key.split(':')[1] + ' options, ';
		}
		if (tag) {
			tag = tag.replace(/_/g, '-');
			tag = tag.substring(0, tag.length - 2);
			markerPopup += L.Util.template(tagTmpl, { tag: 'Cuisine', value: tag, iconName: 'fas fa-utensils' });
		}
		return markerPopup;
	};
	var service_parser = function (tags) {
		var tag = '', markerPopup = '';
		if (tags.takeaway === 'yes') tag += 'takeaway, ';
		else if (tags.takeaway === 'only') tag += 'takeaway only, ';
		if (tags.delivery === 'yes') tag += 'delivery, ';
		if (tags.beer_garden === 'yes') tag += 'beer garden, ';
		else if (tags.outdoor_seating === 'yes') tag += 'outdoor seating, ';
		if (tags.reservation === 'yes') tag += 'takes reservation, ';
		else if (tags.reservation === 'required') tag += 'needs reservation, ';
		if (tags['url:just_eat']) tag += '<a href="' + tags['url:just_eat'] + '" title="just-eat.com" target="_blank">just-eat</a>, ';
		if (tag) markerPopup += L.Util.template(tagTmpl, { tag: 'Service', value: tag.substring(0, tag.length - 2), iconName: 'fas fa-shopping-bag' });
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: cuisine_parser},
		{callback: service_parser}
	]);
}
function fuelstation_parser(tags, titlePopup) {
	var fuel_parser = function (tags) {
		var markerPopup = '', tag = '';
		for (var key in tags) {
			if (key.indexOf('fuel:') === 0 && (tags[key] === 'yes')) tag += key.split(':')[1] + ', ';
		}
		if (tag) {
			tag = tag.replace(/_/g, '-');
			tag = tag.substring(0, tag.length - 2);
			markerPopup += L.Util.template(tagTmpl, { tag: 'Fuel options', value: tag, iconName: 'fas fa-gas-pump' });
		}
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'shop', label: 'Shop', iconName: 'fas fa-store-alt'},
		{callback: fuel_parser}
	]);
}
function healthcare_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'healthcare', label: 'Healthcare type', iconName: 'fas fa-medkit'},
		{callback: generic_tag_parser, tag: 'healthcare:speciality', label: 'Healthcare speciality', iconName: 'fas fa-medkit'}
	]);
}
function historic_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'historic', label: 'Historic type', iconName: 'fas fa-university'},
		{callback: generic_tag_parser, tag: 'bunker_type', label: 'Bunker type', iconName: 'fas fa-cube'},
		{callback: generic_tag_parser, tag: 'artist_name', label: 'Artist', iconName: 'fas fa-user'},
		{callback: generic_tag_parser, tag: 'inscription', label: 'Inscription', iconName: 'fas fa-pen-square'},
		{callback: generic_tag_parser, tag: 'wreck:date_sunk', label: 'Date sunk', iconName: 'fas fa-ship'},
		{callback: generic_tag_parser, tag: 'wreck:visible_at_low_tide', label: 'Visible at low tide', iconName: 'fas fa-ship'}
	]);
}
function hotel_parser(tags, titlePopup) {
	var hotelservices_parser = function (tags) {
		var markerPopup = '', tag = '';
		if (tags.stars) {
			var result = '<a href="https://www.visitengland.com/plan-your-visit/quality-assessment-and-star-ratings/visitengland-star-ratings" title="' + tags.stars + ' stars" target="_blank">';
			for (var c = 0; c < tags.stars; c++) {
				result += '<i class="far fa-star fa-fw"></i>';
			}
			result += '</a>';
			markerPopup += L.Util.template(tagTmpl, { tag: 'VisitEngland rating', value: result, iconName: 'fas fa-star' });
		}
		if (tags.view) tag += tags.view + ' view; ';
		if (tags.balcony) tag += 'balcony; ';
		if (tags.cooking) tag += 'self-catering; ';
		if (tag) markerPopup += L.Util.template(tagTmpl, { tag: 'Accomodation', value: tag, iconName: 'fas fa-bed' });
		// booking.com affiliate link
		if (tags['url:booking_com']) markerPopup += L.Util.template(tagTmpl, { tag: 'Check avalibility', value: '<a href="' + tags['url:booking_com'] + '?aid=1335159&no_rooms=1&group_adults=1" title="booking.com" target="_blank"><img alt="booking.com" class="popup-imgBooking" src="assets/img/booking_com.png"></a>', iconName: 'fas fa-file' });
		return markerPopup;
	};
	return parse_tags(tags, titlePopup,	[
		{callback: hotelservices_parser},
		{callback: generic_tag_parser, tag: 'rooms', label: 'Rooms', iconName: 'fas fa-bed'}
	]);
}
function hospital_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'emergency', label: 'Emergency', iconName: 'fas fa-ambulance'}
	]);
}
function info_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'board_type', label: 'Board type', iconName: 'fas fa-map-signs'},
		{callback: generic_tag_parser, tag: 'map_size', label: 'Map size', iconName: 'fas fa-map-signs'},
		{callback: generic_tag_parser, tag: 'ref', label: 'Reference', iconName: 'fas fa-hashtag'}
	]);
}
function post_parser(tags, titlePopup) {
	var postcypher_parser = function (tags) {
		var royalcypher = tags.royal_cypher;
		var markerPopup = '';
		if (royalcypher) {
			switch (royalcypher) {
				case 'VR' : royalcypher += ': Victoria (1837-1901)'; break;
				case 'EVIIR' : royalcypher += ': Edward VII (1901-1910)'; break;
				case 'GR' : royalcypher += ': George V (1910-1936)'; break;
				case 'EVIIIR' : royalcypher += ': Edward VIII (1936)'; break;
				case 'GVIR' : royalcypher += ': George VI (1936-1952)'; break;
				case 'EIIR' : royalcypher += ': Elizabeth II (1952+)'; break;
			}
			markerPopup += L.Util.template(tagTmpl, { tag: 'Royal cypher', value: royalcypher, iconName: 'fas fa-archive' });
		}
		return markerPopup;
	};
	var collection_parser = function (tags) {
		var markerPopup = '';
		if (tags.collection_times) {
			var strNextChange, ct = new opening_hours(tags.collection_times, { 'address':{ 'state':'England', 'country_code':'gb' } }, 1).getNextChange();
			if (ct.getDate() === new Date().getDate()) strNextChange = 'Today in ' + time_parser((ct - new Date()) / 60000);
			else if (ct.getDate() === new Date().getDate() + 1) strNextChange = 'Tomorrow ' + ct.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
			else if (ct.getDate() > new Date().getDate() + 1) strNextChange = ct.toLocaleDateString('en-GB', { weekday: 'long' }) + ' ' + ct.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
			ctState = ct.getDate() === new Date().getDate() && ct.getDate() >= new Date().getDate() ? true : false;
			markerPopup += L.Util.template(tagTmpl, { tag: 'Next collection', value: '<span title="' + tags.collection_times + '">' + strNextChange + '</span>', iconName: 'openColor-' + ctState + ' fas fa-circle' });
		}
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: postcypher_parser},
		{callback: generic_tag_parser, tag: 'post_box:mounting', label: 'Mounted on', iconName: 'fas fa-archive'},
		{callback: generic_tag_parser, tag: 'collection_times', label: 'Collection times', iconName: 'fas fa-clock'},
		{callback: collection_parser}
	]);
}
function recyclecentre_parser(tags, titlePopup) {
	var recycle_parser = function (tags) {
		var markerPopup = '', tag = '';
		for (var key in tags) {
			if (key.indexOf('recycling:') === 0 && (tags[key] === 'yes')) tag += key.split(':')[1] + ', ';
		}
		if (tag) {
			tag = tag.replace(/_/g, '-');
			tag = tag.substring(0, tag.length - 2);
			markerPopup += L.Util.template(tagTmpl, { tag: 'Recycling options', value: tag, iconName: 'fas fa-recycle' });
		}
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: recycle_parser}
	]);
}
function shelter_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'shelter_type', label: 'Shelter type', iconName: 'fas fa-umbrella'}
	]);
}
function school_parser(tags, titlePopup) {
	var edubase_parser = function (tags) {
		var tag = tags['ref:edubase'], markerPopup = '';
		if (tag) {
			var link = '<a href="https://www.education.gov.uk/edubase/establishment/summary.xhtml?urn=' + tag + '" title="Department for Education" target="_blank">' + tag + '</a> ' +
				'/ <a href="https://reports.ofsted.gov.uk/inspection-reports/find-inspection-report/provider/ELS/' + tag + '" title="Ofstead" target="_blank">Ofstead</a>';
			markerPopup += L.Util.template(tagTmpl, { tag: 'EduBase URN', value: link, iconName: 'fas fa-school' });
		}
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: edubase_parser}
	]);
}
function socialf_parser(tags, titlePopup) {
	var socialfservices_parser = function (tags) {
		var markerPopup = '', tag = '';
		if (tags['social_facility:for']) tag += tags['social_facility:for'] + ' ';
		if (tags.social_facility) tag += tags.social_facility;
		if (tag) {
			tag = tag.replace(/_/g, ' ');
			markerPopup += L.Util.template(tagTmpl, { tag: 'Social facility', value: tag, iconName: 'fas fa-users' });
		}
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: socialfservices_parser},
		{callback: generic_tag_parser, tag: 'capacity', label: 'Capacity', iconName: 'fas fa-users'}
	]);
}
function surveyp_parser(tags, titlePopup) {
	var trigpointuk_parser = function (tags) {
		var tag = tags.tpuk_ref, markerPopup = '';
		if (tag) {
			var link = '<a href="http://trigpointing.uk/trig/' + tag.split('TP')[1] + '" title="Trigpointing UK" target="_blank">' + tag + '</a>';
			markerPopup += L.Util.template(tagTmpl, { tag: 'TrigpointingUK', value: link, iconName: 'fas fa-monument' });
		}
		return markerPopup;
	};
	return parse_tags(tags, titlePopup, [
		{callback: trigpointuk_parser},
		{callback: generic_tag_parser, tag: 'ref', label: 'Bracket number', iconName: 'fas fa-hashtag'},
		{callback: generic_tag_parser, tag: 'ele', label: 'Elevation (m above sea)', iconName: 'fas fa-arrow-up'},
		{callback: generic_tag_parser, tag: 'height', label: 'Height (m above ground)', iconName: 'fas fa-arrow-up'}
	]);
}
function tap_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'drinking_water', label: 'Drinking water', iconName: 'fas fa-tint'},
	]);
}
function taxi_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [ {callback: generic_tag_parser, tag: 'capacity', label: 'Taxi rank capacity', iconName: 'fas fa-taxi'} ]);
}
function telephone_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'disused', label: 'Disused', iconName: 'fas fa-wrench'},
		{callback: generic_tag_parser, tag: 'internet_access', label: 'E-mail', iconName: 'fas fa-at'},
		{callback: generic_tag_parser, tag: 'sms', label: 'SMS Text', iconName: 'fas fa-mobile-alt'},
		{callback: generic_tag_parser, tag: 'covered', label: 'Covered', iconName: 'fas fa-umbrella'}
	]);
}
function toilet_parser(tags, titlePopup) {
	return parse_tags( tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'indoor', label: 'Enter building to access', iconName: 'fas fa-sign-in-alt'}
	]);
}
function worship_parser(tags, titlePopup) {
	return parse_tags(tags, titlePopup, [
		{callback: generic_tag_parser, tag: 'denomination', label: 'Denomination', iconName: 'fas fa-dot-circle'},
		{callback: generic_tag_parser, tag: 'service_times', label: 'Service times', iconName: 'fas fa-clock'}
	]);
}

// https://github.com/opening-hours/opening_hours.js
function opening_hours_parser(tags) {
	var openhrs = '';
	var drawTable = function (oh, date_today) {
		var months = ['Jan', 'Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		var weekdays = ['Su','Mo','Tu','We','Th','Fr','Sa'];
		date_today = new Date(date_today);
		date_today.setHours(0, 0, 0, 0);
		var date = new Date(date_today);
		date.setDate(date.getDate() - 1);
		var table = [];
		for (var row = 0; row < 7; row++) {
			date.setDate(date.getDate() + 1);
			var ohState = oh.getState(date);
			var prevdate = date;
			var curdate = date;
			table[row] = {
				date: new Date(date),
				text: []
			};
			while (curdate.getTime() - date.getTime() < 24*60*60*1000) {
				curdate = oh.getNextChange(curdate);
				if (typeof curdate === 'undefined') return '';
				if (ohState) {
					var text = pad(prevdate.getHours()) + ':' + pad(prevdate.getMinutes()) + '-';
					if (prevdate.getDay() !== curdate.getDay()) text += '24:00';
					else text += pad(curdate.getHours()) + ':' + pad(curdate.getMinutes());
					if (oh.getComment(prevdate)) text += '<br>' + oh.getComment(prevdate);
					table[row].text.push(text);
				}
				prevdate = curdate;
				ohState = !ohState;
			}
		}
		ret = '<table>';
		for (row in table) {
			var today = table[row].date.getDay() == date_today.getDay();
			var endweek = ((table[row].date.getDay() + 1) % 7) == date_today.getDay();
			var cl = today ? ' class="today"' : endweek ? ' class="endweek"' : '';
			ret += '<tr' + cl + '>' +
				'<td class="day ' + (table[row].date.getDay() % 6 === 0 ? 'weekend' : 'workday') + '">' +
					weekdays[table[row].date.getDay()] + ' ' + months[table[row].date.getMonth()] + ' ' + table[row].date.getDate() +
				'</td><td class="times">' +
					(table[row].text.join(', ') || (oh.getComment(table[row].date) || 'closed')).toUpperCase() +
				'</td>' +
			'</tr>';
		}
		ret += '</table>';
		return ret;
	};
	try {
		var openhrsState = [];
		var oh = new opening_hours(tags.opening_hours, { 'address':{ 'state':'England', 'country_code':'gb' } });
		var strNextChange, comment = (oh.getComment() || oh.getComment(oh.getNextChange()) || '');
		ohState = oh.getState();
		if (oh.getUnknown()) {
			ohState = (oh.getComment(new Date()) && oh.getNextChange() !== undefined) ? true : 'depends';
			strNextChange = comment;
		}
		else strNextChange = oh.prettifyValue();
		if (oh.getNextChange()) {
			var nextTime = oh.getNextChange().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
			var dateTomorrow = new Date(), dateWeek = new Date();
			dateTomorrow.setDate(new Date().getDate() + 1);
			dateWeek.setDate(new Date().getDate() + 7);
			// display 'today'
			if (oh.getNextChange().toLocaleDateString('en-GB') === new Date().toLocaleDateString('en-GB')) {
				strNextChange = nextTime;
			}
			// display 'tomorrow'
			else if (oh.getNextChange().toLocaleDateString('en-GB') === dateTomorrow.toLocaleDateString('en-GB')) {
				if (nextTime === '00:00') strNextChange = 'Midnight';
				else strNextChange = 'Tomorrow ' + nextTime;
			}
			// display day name if within a week
			else if (oh.getNextChange().getTime() > dateTomorrow.getTime() && oh.getNextChange().getTime() < dateWeek.getTime()) {
				strNextChange = oh.getNextChange().toLocaleDateString('en-GB', { weekday: 'long' });
				if (nextTime !== '00:00') strNextChange += ' ' + nextTime;
			}
			// otherwise display date
			else strNextChange = date_parser(oh.getNextChange().toLocaleDateString('en-GB'), 'short');
			if (comment) strNextChange += ' (' + comment + ')';
		}
		// create readable table
		var ohTable = drawTable(oh, new Date());
		var minWidth = ohTable ? '250px' : '100px';
		if (tags.opening_hours.indexOf('PH ') === -1) ohTable += '<div class="comment" style="text-align:left; padding-top:5px;">Holiday periods may differ.</div>';
		// show tag and collapsible accordion
		if (ohState === true) openhrsState = 'Open until';
		else if (ohState === false) openhrsState = 'Closed until';
		else if (ohState === 'depends') openhrsState = 'Depends on';
		if (openhrsState) {	openhrs =
			'<div class="popup-ohContainer" style="min-width:' + minWidth + ';">' +
				'<span class="popup-tagContainer" title="' + tags.opening_hours.replace(/"/g, '&quot;') + '">' +
					'<i class="popup-tagIcon popup-openhrsState openColor-' + ohState + ' fas fa-circle fa-fw"></i>' +
					'<span class="popup-tagValue"><strong>' + openhrsState + ':</strong> ' + strNextChange + '&nbsp; </span>' +
					'<i title="See full opening hours" class="theme fas fa-caret-down fa-fw"></i>' +
				'</span>' +
				'<div class="popup-ohTable">' + ohTable + '</div>' +
			'</div>';
		}
	}
	catch(err) {
		if (tags.opening_hours && $('#inputDebug').is(':checked')) console.debug('ERROR: Object "' + tags.name + '" cannot parse hours: ' + tags.opening_hours + '. ' + err);
	}
	return openhrs;
}

// other popup box elements
function image_parser(tags) {
	// get images
	var markerPopup = '', lID;
	if ((tags.image || tags.wikimedia_commons) && !$('#inputImage').is(':checked')) {
		markerPopup += generic_img_parser(tags.image || tags.wikimedia_commons, 0, 'inherit', tags['source:image'] || '');
		// support up to 5 additional images
		if (tags['image:360'] || tags.image_1) {
			for (x = 1; x <= 5; x++) {
				if (tags['image_' + x]) {
					lID = x;
					markerPopup += generic_img_parser(tags['image_' + x], x, 'none', tags['source:image_' + x] || '');
				}
			}
			markerPopup += show_img_controls(parseInt(lID+1), tags['image:360']);
		}
	}
	return markerPopup;
}
function nav360(img) {
	popupWindow('https://tools.wmflabs.org/panoviewer/#' + encodeURIComponent(img.split(':')[1]), 'imgWindow', 800, 600);
}
function navImg(direction) {
	// get the current and last image
	var cID = parseInt($('.popup-imgContainer:visible').attr('id').split('img')[1]);
	var lID = parseInt($('.popup-imgContainer:last').attr('id').split('img')[1]);
	// get the next image
	var swapImg = function (nID) {
		$('.popup-imgContainer').hide(400).filter('.popup-imgContainer#img' + nID).show(400);
		if (!$('#img' + nID + ' .attribd').length) getWikiAttrib(nID);
		$('.navigateItem > .fa-image > title').html(parseInt(nID+1) + ' of ' + parseInt(lID+1));
	};
	// navigate through multiple images. 0 = previous, 1 = next
	if (direction === 0 && cID > 0) swapImg(cID - 1);
	else if (direction === 1 && cID < lID) swapImg(cID + 1);
	else if (direction === 0 && cID === 0 && cID !== lID) swapImg(lID);
	else if (direction === 1 && cID === lID && cID !== 0) swapImg(0);
}
function getWikiAttrib(id) {
	// wikimedia api for image attribution
	if ($('#img' + id).html() && $('#img' + id).html().indexOf('wikimedia.org') !== -1) {
		var img = $('#img' + id + ' img').attr('data-url');
		$.ajax({
			url: 'https://commons.wikimedia.org/w/api.php',
			data: { action: 'query', prop: 'imageinfo', iiprop: 'extmetadata', titles: img, format: 'json' },
			dataType: 'jsonp',
			success: function (result) {
				if (!result.query.pages[-1]) {
					var imgAttrib = result.query.pages[Object.keys(result.query.pages)[0]].imageinfo['0'].extmetadata;
					var imgDate = imgAttrib.DateTimeOriginal ? imgAttrib.DateTimeOriginal.value : imgAttrib.DateTime.value;
					imgDate = Date.parse(imgDate) ? new Date(imgDate).getFullYear() : imgDate;
					var imgLicence = imgAttrib.LicenseUrl ? '<a href="' + imgAttrib.LicenseUrl.value + '" title="Licence" target="_blank">' + imgAttrib.LicenseShortName.value + '</a>' : imgAttrib.LicenseShortName.value;
					if ($('#inputDebug').is(':checked')) console.debug(imgAttrib);
					$('#img' + id + ' .popup-imgAttrib').html(
						'&copy; ' + imgAttrib.Artist.value + ', ' + imgDate +
						' | ' + imgLicence +
						' | <a href="https://commons.wikimedia.org/wiki/' + img + '" title="Wikimedia Commons" target="_blank">Full image</a>'
					);
					$('.popup-imgAttrib a').filter(':first').attr('target', '_blank').attr('title', 'Author');
				}
				else $('#img' + id + ' .popup-imgAttrib').html('Error: Attribution not found');
				$('#img' + id + ' .popup-imgAttrib').addClass('attribd');
			}
		});
	}
}

// formatting parsers
function titleCase(str) {
	str = str.replace(/;/g, ', ').replace(/_/g, ' ');
	if (str === str.toUpperCase()) return str;
	else return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}
function date_parser(dtStr, style) {
	// parse ISO 8601 dates
	var tm, dt, dtFrmt = dtStr.split('-').length - 1;
	// check for time
	tm = (dtStr.indexOf(':') > -1) ? tm = ', ' + dtStr.split(' ')[1] : '';
	if (tm) dtStr = dtStr.split(' ')[0];
	if (style === 'long') {
		dt = new Date(dtStr);
		if (dtFrmt === 2) dt = dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
		else if (dtFrmt === 1) dt = dt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
		else dt = dtStr;
		if (dt.indexOf('/') > -1) style = 'short';
	}
	if (style === 'short') {
		if (dtFrmt === 2) dt = dtStr.split('-')[2] + '/' + dtStr.split('-')[1] + '/' + dtStr.split('-')[0];
		else if (dtFrmt === 1) dt = dtStr.split('-')[1] + '/' + dtStr.split('-')[0];
		else dt = dtStr;
	}
	if (dt === 'Invalid Date' || dt === undefined) dt = dtStr;
	return dt + tm;
}
function time_parser(tmStr) {
	// convert to hours and minutes
	tmStr = Math.round(tmStr);
	var m = tmStr % 60;
	var h = (tmStr - m) / 60;
	if (h < 1 && m < 1) return -1;
	return (h) ? pad(h) + ':' + pad(m) + ' h:m' : m + ' m';
}
function pad(n) {
	// pad single number
	return n < 10 ? '0' + n : n;
}
function elementType(e) {
	switch (e.toLowerCase()) {
		case 'n' : return 'node';
		case 'w' : return 'way';
		case 'r' : return 'relation';
	}
}
