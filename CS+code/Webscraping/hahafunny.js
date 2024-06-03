$( document ).ready(function() {

    $("#turn").bind("touchmove", function(e){
        e.preventDefault();
    });

    var get_city_file = '/uploads/media/city/icon/'; // '/get/file?file=media/city/icon/
    var get_platform_file = '/uploads/media/platform/icon/';
    var get_assetscategories_path = '/uploads/media/assetscategories/icon/';

    var initial_data;
    var map;
    var network_paths = [];

    var search_on = false;
    var selected_network = null;
    var selected_marker = null;
    var selected_asset = null;
    var selected_city = null;
    var current_infoWindow = null;

    var initial_map_proportion = 0.7;

    var gmap_style_json = [
        {
            "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [ { "visibility": "off" } ]
        },
        {
            "featureType": "landscape", "stylers": [ {  "color": "#e8f2e4" } ]
        },
        {
            "featureType": "poi", "stylers": [ {  "color": "#e8f2e4" } ]
        },
        {
            "featureType": "road", "stylers": [ {  "color": "#e8f2e4" } ]
        },
        {
            "featureType": "water", "stylers": [ { "color": "#f3fafe" } ]
        }
    ];

    var gmap_style_json_off = [
        {
            "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [ { "visibility": "off" } ]
        },
        {
            "featureType": "landscape", "stylers": [ {  "color": "#f1f7ee" } ]
        },
        {
            "featureType": "poi", "stylers": [ {  "color": "#f1f7ee" } ]
        },
        {
            "featureType": "road", "stylers": [ {  "color": "#f1f7ee" } ]
        },
        {
            "featureType": "water", "stylers": [ { "color": "#f7fcfe" } ]
        }
    ];

    
    var marker_generic = new google.maps.MarkerImage('/img/ico_point.png',
        null, 
        new google.maps.Point(0, 0),
        new google.maps.Point(5, 5),
        new google.maps.Size(10, 10)
    );

    var marker_generic_selected = new google.maps.MarkerImage('/img/ico_point.png',
        null,
        new google.maps.Point(0, 0),
        new google.maps.Point(7, 7),
        new google.maps.Size(14, 14)
    );

    var dashed_polyline = {path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2.5};
    var dashed_polyline_off = {path: 'M 0,-1 0,1', strokeOpacity: 0.2, scale: 2.5};

    function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 4,
            minZoom: 1,
            maxZoom: 8,
            center: { lat: 30.2, lng: 27.8 },
            styles: gmap_style_json,
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy'
        });
    
        map.addListener('mouseout', function() {
            if (current_infoWindow) {
                current_infoWindow.close();
                current_infoWindow = null;
            }
            $("a").removeClass("active");
        });
    
        google.maps.event.addListenerOnce(map, 'idle', function() {
            if ($(window).width() < 992) {
                var height = $(window).height();
                $("#map_wrapper").animate({
                    "height": height * initial_map_proportion
                }, 200);
    
                map.setOptions({ zoomControlOptions: { position: google.maps.ControlPosition.LEFT_TOP } });
            }
        });
    
        google.maps.Polyline.prototype.getBounds = function() {
            var bounds = new google.maps.LatLngBounds();
            this.getPath().forEach(function(item, index) {
                bounds.extend(new google.maps.LatLng(item.lat(), item.lng()));
            });
            return bounds;
        };
    
        var _get = window.location.search;
        var preview = (_get == '?preview=1') ? _get : '';
        $.ajax({
            type: 'GET',
            url: '/' + vars.routes.api_initial_data.path + preview,
            success: function(data) {
                //console.log(data);
    
                initial_data = JSON.parse(data);
                console.log(initial_data);
                var networksData = [];
    
                for (var index in initial_data.networks) {
                    var network = initial_data.networks[index];
                    var networkData = {
                        name: network.name,
                        paths: []
                    };
    
                    for (var index2 in network.paths) {
                        var path = network.paths[index2];
                        var pathData = {
                            start: path.start,
                            end: path.end,
                            coordinates: path.coordinates
                        };
    
                        networkData.paths.push(pathData);
                        add_polyline(network, index2, path); // Existing function to add polylines to the map
                    }
    
                    networksData.push(networkData);
                }
    
                // Trigger file download
                var jsonStr = JSON.stringify(initial_data, null, 2);
                var blob = new Blob([jsonStr], { type: "application/json" });
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = "initial_data.json";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
    
                update_path_options();
                handle_sidebar_initial_content();
                handle_initial_bounds();
            }
        });
    }
    initMap();


function add_polyline(network, parent_id, path_keypoints){
    var coordinates = [];
    for(var index in path_keypoints) {
        var keypoint = path_keypoints[index];
        if(keypoint.lat != null && keypoint.lng != null){
            coordinates.push({lat: parseFloat(keypoint.lat), lng: parseFloat(keypoint.lng)});
        }
    }
    if(coordinates.length > 0){
        var network_markers = [];
        var contentString = '<div class="popup-content"><h3>' + network.name + '</h3></div>';
        var infoWindow = new google.maps.InfoWindow({
            content: contentString
        });

        var network_color = "#2f4486";
        if(network.color != null){
            network_color = network.color;
        }

        var network_path = new google.maps.Polyline({
            infoWindow: infoWindow,
            path: coordinates,
            geodesic: false,
            strokeColor: network_color,
            strokeOpacity: 1.0,
            strokeWeight: 2,
            network: network,
            parent_id: parent_id
        });
        google.maps.event.addListener(network_path, 'mouseover', function(event) {

            if(selected_city != null){
                if($(".networks-wrapper a[data-id=" + this.network.id + "]").length > 0){
                    if(current_infoWindow){
                        current_infoWindow.close();
                    }
                    current_infoWindow = this.infoWindow;
                    current_infoWindow.setPosition(event.latLng);
                    current_infoWindow.open(map);
    
                    $(".networks-wrapper a").removeClass("active");
                    $(".networks-wrapper a[data-id=" + this.network.id + "]").addClass("active");
                    var scrolltop = $("a[data-id=" + this.network.id + "]").offset().top - $('.city-wrapper-detail').offset().top;
                    simpleBar.getScrollElement().scrollTop = scrolltop;
                }
            }else{
                if(selected_network != null || search_on == true){
                    return;
                }

                if(current_infoWindow){
                    current_infoWindow.close();
                }
                current_infoWindow = this.infoWindow;
                current_infoWindow.setPosition(event.latLng);
                current_infoWindow.open(map);

                $(".networks-wrapper a").removeClass("active");
                $(".networks-wrapper a[data-id=" + this.network.id + "]").addClass("active");
                var scrolltop = $("a[data-id=" + this.network.id + "]").offset().top - $('.container-assets-categories').offset().top;
                simpleBar.getScrollElement().scrollTop = scrolltop;
            }
        });
        google.maps.event.addListener(network_path, 'mouseout', function(event) {
            if(selected_network != null || search_on == true){
                return;
            }

            $(".networks-wrapper a").removeClass("active");
            if(current_infoWindow){
                current_infoWindow.close();
                current_infoWindow = null;
            }
        });

        google.maps.event.addListener(network_path, 'click', function (event) {
            selected_network = this.network;
            handle_network_click();
            handle_sidebar_network_content();
        });

        for(var index in network.keypoints) {
            var keypoint = network.keypoints[index];
            if(keypoint.idCity == null || keypoint.idCity == 0){
                continue;
            }

            var contentString = '<div class="popup-content"><h3>' + keypoint.nameCity + '</h3></div>';
            var infoWindow = new google.maps.InfoWindow({
                content: contentString
            });
            var marker = new google.maps.Marker({
                icon: marker_generic,
                infoWindow: infoWindow,
                keypoint: keypoint, 
                network: network,
                position: {lat: parseFloat(keypoint.lat), lng: parseFloat(keypoint.lng)},
                map: map
            });
            marker.addListener('mouseover', function() {
                for(var index in network_paths) {
                    var markers = network_paths[index].markers;
                    for(var index2 in markers){
                        var marker = markers[index2];
                        if(marker.keypoint.id == this.keypoint.id){
                            selected_marker = marker;
                            $("a").removeClass("active");
                            if($("a[data-city_id=" + selected_marker.keypoint.idCity + "]").length > 0){
                                $("a[data-city_id=" + selected_marker.keypoint.idCity + "]").addClass("active");
                                var scrolltop = $("a[data-city_id=" + selected_marker.keypoint.idCity + "]").offset().top - $('.network-cities').offset().top;
                                simpleBar.getScrollElement().scrollTop = scrolltop;
                                handle_open_popup();
                            }
                            break;
                        }
                    }
                }
            });
            marker.addListener('mouseleave', function() {
                $("a").removeClass("active");
            });
            
            google.maps.event.addListener(marker, 'click', function() {
                selected_marker = this;
                //selected_network = this.network;
                handle_marker_click();
                handle_sidebar_city_content(selected_marker.keypoint.idCity);
            });
            network_markers.push(marker);
        }

        var object = {
            "network": network_path,
            "markers": network_markers
        };

        network_path.setMap(map);
        network_paths.push(object);
    }
    
}

function update_path_options(){

    for(var index in network_paths) {

        var network_path = network_paths[index].network;
        var markers = network_paths[index].markers;

        var path_property = network_path.network.paths_properties[network_path.parent_id];
        var dashed = path_property.dashed;
        var network_color = path_property.color;

        if(selected_network !== null){
            if(selected_network.id == network_path.network.id){
                handle_path_full(dashed, network_color, network_path);
                handle_markers(markers);
            }else{
                handle_path_off(dashed, network_color, network_path);
                handle_markers(markers);
            }
        }else{
            handle_path_full(dashed, network_color, network_path);
            handle_markers(markers);
        }
        
    }
}

function handle_path_full(dashed, network_color, network_path){
    if(dashed){
        network_path.setOptions({
            strokeColor: network_color,
            strokeOpacity: 0.01,
            icons: [{
                icon: dashed_polyline,
                offset: '0',
                repeat: '20px'
            }],
        });
    }else{
        network_path.setOptions({
            strokeColor: network_color,
            strokeOpacity: 1,
            strokeWeight: 2
        });
    }
}

function handle_path_off(dashed, network_color, network_path){
    if(dashed){
        network_path.setOptions({
            strokeColor: network_color,
            strokeOpacity: 0.01,
            icons: [{
                icon: dashed_polyline_off,
                offset: '0',
                repeat: '20px'
            }],
        });
    }else{
        network_path.setOptions({
            strokeColor: network_color,
            strokeOpacity: 0.2,
            strokeWeight: 2
        });
    }
}

function handle_markers(markers){
    for(var index in markers){
        var marker = markers[index];
        marker.setVisible(true);
        if(selected_marker !== null && selected_marker.keypoint.id == marker.keypoint.id){
            //marker.setIcon(marker_generic_selected);
        }else{
            //marker.setIcon(marker_generic);
        }
    }
}

function handle_initial_bounds(){
    var bounds = new google.maps.LatLngBounds();
    for(var index in network_paths) {
        var markers = network_paths[index].markers;
        for(var index in markers){
            var keypoint = markers[index].keypoint;
            if(keypoint.lat != null && keypoint.lng != null){
                bounds.extend(new google.maps.LatLng({lat: parseFloat(keypoint.lat), lng: parseFloat(keypoint.lng)}));
            }
        }
    }
    map.fitBounds(bounds, 10);
}

function handle_change_map_bounds(){
    var bounds = new google.maps.LatLngBounds();
    if(selected_network !== null){
        for(var index in network_paths) {
            var network_path = network_paths[index].network;
            if(selected_network.id == network_path.network.id){
                network_path.getPath().forEach(function(item, index2) {
                    bounds.extend(new google.maps.LatLng(item.lat(), item.lng()));
                });
            }
        }
    }
    map.fitBounds(bounds);
}

function handle_network_click(){
    update_path_options();
    handle_change_map_bounds();

    map.setOptions({styles: gmap_style_json_off});

}

function handle_marker_click(){
    
    update_path_options();

    handle_open_popup();

    map.setOptions({styles: gmap_style_json_off});
    map.setCenter({lat: parseFloat(selected_marker.keypoint.lat), lng: parseFloat(selected_marker.keypoint.lng)});
    map.setZoom(10);
}

function handle_open_popup(){
    if(current_infoWindow){
        current_infoWindow.close();
    }
    current_infoWindow = selected_marker.infoWindow;
    current_infoWindow.open(map, selected_marker);
}






const simpleBar = new SimpleBar($('.sidebar-content-wrapper')[0], { autoHide: false });
simpleBar.getScrollElement().addEventListener('scroll', function(){
    var height = $(this).scrollTop();
    /*if(height > 10){
        $('.sidebar-top').addClass("shadow");
    }else{
        $('.sidebar-top').removeClass("shadow");
    }*/
});

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

var animation_easing = 'linear';
var animation_open_close_speed = 200;
var fling_start = 20;
var sidebar_fling_start = 100;
var fling_velocity = $(window).height()*3;
var fling_speed = 300;
var fling_speed_content = 300;

var sidebar_margin_fling = false;
var map_height_fling = false;
var last_te = 0;
$("#sidebar").bind('touchstart', function (e) {
    last_te = 0;
    sidebar_margin_fling = false;
    map_height_fling = false;
    $("#sidebar-wrapper").stop();
    $("#map_wrapper").stop();
});
$("#sidebar").bind('touchmove', function (e) {

    if($(window).width() >= 992){
        return;
    }

    var max_sidebar_margin = $("#sidebar-wrapper").height() - $(window).height() + $("#toggle-wrapper").height();
    var current_height = parseInt($("#map_wrapper").height());
    var max_height = $(window).height() - $("#toggle-wrapper").height();
    var te = e.originalEvent.changedTouches[0].clientY;
    if(last_te > 0){
        var diff = parseInt(te - last_te);
        if(Math.abs(diff) < 200){
            var current_margin = parseInt($("#sidebar-wrapper").css('margin-top'));
            var new_height = 0;
            if(diff > 0){
                if(current_margin < 0){
                    if(Math.abs(diff) > sidebar_fling_start){
                        sidebar_margin_fling = true;
                        var new_margin = current_margin + fling_velocity;
                    }else{
                        var new_margin = current_margin + Math.abs(diff);
                    }
                    if(new_margin > 0){
                        new_margin = 0;
                    }
                    if(sidebar_margin_fling && !$("#sidebar-wrapper").is(':animated')){
                        $("#sidebar-wrapper").animate({
                            "margin-top": new_margin
                        }, fling_speed_content, animation_easing);
                    }else{
                        if(!$("#sidebar-wrapper").is(':animated')){
                            $("#sidebar-wrapper").css("margin-top", new_margin);
                        }
                    }
                    
                }else{
                    if(Math.abs(diff) > fling_start){
                        map_height_fling = true;
                        new_height = current_height + fling_velocity;
                    }else{
                        new_height = current_height + Math.abs(diff);
                    }
                    if(new_height > max_height){
                        new_height = max_height;
                    }
                }
            }else{
                if(current_height == 0){
                    if(Math.abs(diff) > sidebar_fling_start){
                        sidebar_margin_fling = true;
                        var new_margin = current_margin - fling_velocity;
                    }else{
                        var new_margin = current_margin - Math.abs(diff);
                    }
                    if(Math.abs(new_margin) > max_sidebar_margin){
                        new_margin = -max_sidebar_margin;
                    }
                    if(new_margin <= 0){
                        if(sidebar_margin_fling && !$("#sidebar-wrapper").is(':animated')){
                            $("#sidebar-wrapper").animate({
                                "margin-top": new_margin
                            }, fling_speed_content, animation_easing);
                        }else{
                            if(!$("#sidebar-wrapper").is(':animated')){
                                $("#sidebar-wrapper").css("margin-top", new_margin);
                            }
                        }
                    }
                }else{
                    if(Math.abs(diff) > fling_start){
                        map_height_fling = true;
                        new_height = current_height - fling_velocity;
                    }else{
                        new_height = current_height - Math.abs(diff);
                    }
                    if(new_height < 0){
                        new_height = 0;
                    }
                }
            }
            
            if(map_height_fling && !$("#map_wrapper").is(':animated')){
                $("#map_wrapper").animate({
                    "height": new_height
                }, fling_speed, animation_easing);
            }else{
                if(!$("#map_wrapper").is(':animated')){
                    $("#map_wrapper").css("height", new_height);
                }
            }
        }
    }
    last_te = te;
    e.preventDefault();
    
});

$("#toggle-wrapper").on("click", function(e){
    var offset = $(this).offset().top;
    var height = $(window).height();
    if(offset > 100){
        $("#map_wrapper").animate({
            "height": 0
        }, animation_open_close_speed, animation_easing);
    }else{
        $("#map_wrapper").animate({
            "height": height*initial_map_proportion
        }, animation_open_close_speed, animation_easing);
    }
    $("#sidebar-wrapper").css("margin-top", 0);
});


$( window ).resize(function() {
    if($(window).width() >= 992){
        $("#map_wrapper").attr("style", "");
        $("#sidebar-wrapper").attr("style", "");
        map.setOptions({ zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM } });
        var widthSide = $('#sidebar-content-wrapper').width();
        $('.back-wrapper').css('width',widthSide);
    }else{
        var height = $(window).height();
        map.setOptions({ zoomControlOptions: { position: google.maps.ControlPosition.LEFT_TOP } });
        $("#map_wrapper").animate({
            "height": height*initial_map_proportion
        }, animation_open_close_speed, animation_easing);
        $("#sidebar-wrapper").css("margin-top", 0);
    }
});






function handle_sidebar_initial_content(){
    html = '';

    html += '<div class="container-assets-categories">';
        html += '<div class="assets-categories-wrapper">';
            html += '<h3>Assets</h3>';
            html += '<ul>';
            for(var index in initial_data.assets_categories) {
                var asset_category = initial_data.assets_categories[index];

                var file = "";
                if(asset_category.file != null){
                    file = get_assetscategories_path + asset_category.file;
                }else{
                    file = "/img/asset_default.svg";
                }
                html += '<li><img class="arrow" src="' + file + '"><a href="#" data-id="' + asset_category.id + '">' + asset_category.name + '</a></li>';
            }
            html += '</ul>';
        html += '</div>';

        html += '<hr>';

        html += '<div class="networks-wrapper">';
            html += '<h3>Networks</h3>';
            html += '<ul>';
            for(var index in initial_data.networks) {
                var network = initial_data.networks[index];
                html += '<li class="d-flex align-items-center">';
                if (network.color != null) {
                    html += '<div class="square" style="background-color: ' + network.color + '">';
                } else {
                    html += '<div class="square">';
                }
                html += '</div><a href="#" data-id="' + network.id + '">' + network.name + '</a></li>';
            }
            html += '</ul>';
        html += '</div>';
    html += '</div>';

    $("#sidebar-content").html(html);

    if($(window).width() < 992){
        var height = $(window).height();
        $("#map_wrapper").animate({
            "height": height*initial_map_proportion
        }, 200);
        $("#sidebar-wrapper").css("margin-top", 0);
    }
}

function handle_sidebar_network_content(){

    simpleBar.getScrollElement().scrollTop = 0;

    if(selected_network == null){
        handle_sidebar_initial_content();
        return;
    }

    html = '';

    html += '<div class="back-wrapper network-back">';
        html += '<a href="#" class="d-flex align-items-center"><img class="arrow" src="/img/ico_back.svg">Back</a>';
    html += '</div>';


    html += '<div class="container-network-detail-wrapper">';
        html += '<div class="network-detail-wrapper">';
            html += '<h2>'  + selected_network.name + '</h2>';
        html += '</div>';

        html += '<h4>Cities</h4>';

        var cities = [];
        var cities_arr = [];
        for(var index in selected_network.keypoints) {
            var keypoint = selected_network.keypoints[index];
            if(keypoint.idCity > 0 && cities.indexOf(keypoint.idCity) == -1){
                cities.push(keypoint.idCity);
                cities_arr.push(keypoint);
            }
        }
        cities_arr.sort(function(a, b){
            if(a.idCity > 0 && b.idCity > 0){
                var nameA = a.nameCity.toLowerCase(), nameB = b.nameCity.toLowerCase();
                if (nameA < nameB){ return -1; }
                if (nameA > nameB){ return 1; }
            }
            return 0;
        });

        html += '<div class="network-cities">';
            html += '<ul>';
            for(var index in cities_arr) {
                var keypoint = cities_arr[index];
                html += '<li><a href="#" data-city_id="' + keypoint.idCity + '" data-id="' + keypoint.id + '">' + keypoint.nameCity + '</a></li>';
            }
            html += '</ul>';
        html += '</div>';
    html += '</div>';

    $("#sidebar-content").html(html);

    if($(window).width() < 992){
        var height = $(window).height();
        $("#map_wrapper").animate({
            "height": height*initial_map_proportion
        }, 200);
        $("#sidebar-wrapper").css("margin-top", 0);
    }
}

function handle_sidebar_city_content(city_id){

    simpleBar.getScrollElement().scrollTop = 0;

    html = '';

    html += '<div class="back-wrapper city-back">';
        html += '<a href="#" class="d-flex align-items-center"><img class="arrow" src="/img/ico_back.svg">Back</a>';
    html += '</div>';

    html += '<div class="city-wrapper-detail">';
        for(var index in initial_data.cities) {
            var city = initial_data.cities[index];
            var file = "";
            if(city.file != null){
                file = get_city_file + city.file;
            }else{
                file = "/img/office_default.svg";
            }
            if(city.id == city_id){

                var add_class = "";
                if((city.type == "" || city.type == null) && (city.address == "" || city.address == null) && (city.info == "" || city.info == null)){
                    add_class = "no-address";
                }

                html += '<div class="city-info-wrapper ' + add_class + '">';
                    html += '<h2>' + city.name + '</h2>';
                    if((city.type != "" && city.type != null) || (city.address != "" && city.address != null) || (city.info != "" && city.info != null)){
                        html += '<div class="city-info d-flex">';
                            html += '<img class="arrow" src="' + file + '">';
                            html += '<div>';
                            if(city.type != "" && city.type != null){
                                html += '<h5>' + city.type + '</h5>';
                            }
                            if(city.address != "" && city.address != null){
                                html += '<p>' + city.address + '</p>';
                            }
                            if(city.info != "" && city.info != null){
                                html += '<p>' + city.info + '</p>';
                            }
                            html += '</div>';
                        html += '</div>';
                    }
                html += '</div>';

                html += '<div class="city-assets">';
                    html += '<h4>Assets</h4>';
                    html += '<ul class="city-assets-list">';
                    for(var index2 in city.assets) {
                        var city_asset = city.assets[index2];
                        var asset_category = find_asset_category_by_id(city_asset.asset_category_id);
                        var file = "";
                        if(asset_category.file != null){
                            file = get_assetscategories_path + asset_category.file;
                        }else{
                            file = "/img/asset_default.svg";
                        }
                        html += '<li class="d-flex">';
                            html += '<img class="arrow" src="' + file + '">';
                            html += '<div>';
                            html += '<h5 class="d-flex align-items-center">' + asset_category.name + '</h5>';
                            if(city_asset.address != null){
                                var asset_name = city_asset.name;
                                if(asset_name != "" && asset_name != null){
                                    html += '<p>' + asset_name + '</p>';
                                }
                                html += '<p>' + city_asset.address + '</p>';
                            }

                            if(city_asset.assets_solutions != null && city_asset.assets_solutions.length > 0){
                                html += '<h6>CATEGORY PRODUCTS OFFERED:</h6>';

                                var assets = [];
                                for(var index3 in city_asset.assets_solutions) {
                                    var asset_solution = city_asset.assets_solutions[index3];
                                    var solution = find_solution_by_id(asset_solution.solution_id);
                                    if(solution != false){
                                        platform = find_platform_by_id(solution.platform_id);
                                        if(platform != false){

                                            var platform_obj = assets.find(function (o) {
                                                return o.platform_id === platform.id;
                                            });

                                            if(typeof platform_obj == "undefined"){
                                                platform_data = {
                                                    "platform_id": platform.id,
                                                    "platform": platform,
                                                    "solutions": [solution]
                                                }
                                                assets.push(platform_data);
                                            }else{
                                                platform_obj.solutions.push(solution);
                                            }
                                        }
                                    }
                                }

                                for(var index3 in assets) {
                                    var asset = assets[index3];
                                    var file = "";
                                    if(asset.platform.file != null){
                                        file = get_platform_file + asset.platform.file;
                                    }else{
                                        //file = "/img/asset_default.svg";
                                    }
                                    html += '<div class="d-flex inner">';
                                        if(file != ""){
                                            html += '<img class="arrow" src="' + file + '">';
                                        }
                                        html += '<div>';
                                            html += '<h3>' + asset.platform.name + '</h3>';
                                            /*html += '<ul>';
                                            for(var index4 in asset.solutions) {
                                                var solution = asset.solutions[index4];
                                                var url = "#";
                                                if(solution.url){
                                                    url = solution.url;
                                                }
                                                html += '<li><a href="' + url + '" target="_blank">' +  solution.name + '</a>';
                                            }
                                            html += '</ul>';*/
                                        html += '</div>';
                                    html += '</div>';
                                }
                            }
                        
                            html += '</div>';
                        html += '</li>';
                        if(index2 < city.assets.length -1){
                            html += '<hr>';
                        }
                    }
                    html += '</ul>';

                    html += '<div class="networks-wrapper">';
                        html += '<h4>Networks</h4>';
                        html += '<ul>';
                        for(var index2 in initial_data.networks) {
                            var network = initial_data.networks[index2];
                            var network_has_city = false;
                            for(var index3 in network.keypoints) {
                                var keypoint = network.keypoints[index3];
                                if(keypoint.idCity == city.id){
                                    network_has_city = true;
                                    break;
                                }
                            }
                            if(network_has_city){
                                html += '<li class="d-flex align-items-center">';
                                if (network.color != null) {
                                    html += '<div class="square" style="background-color: ' + network.color + '">';
                                } else {
                                    html += '<div class="square">';
                                }
                                html += '</div><a href="#" data-fromcity="' + city.id + '" data-id="' + network.id + '">' + network.name + '</a></li>';
                            }
                        }
                        html += '</ul>';
                    html += '</div>';

                    html += '<a target="_blank" href="https://www.tisparkle.com/contact-us/contact-form" class="btn-outline">Contact US<span><i class="fa fa-long-arrow-right" ></i></span></a>';

                html += '</div>';
                break;
            }
        }
    html += '</div>';

    $("#sidebar-content").html(html);

    if($(window).width() < 992){
        var height = $(window).height();
        $("#map_wrapper").animate({
            "height": height*initial_map_proportion
        }, 200);
        $("#sidebar-wrapper").css("margin-top", 0);
    }
}

function handle_sidebar_asset_content(){

    simpleBar.getScrollElement().scrollTop = 0;

    handle_initial_bounds();

    hide_all_components();

    if(selected_asset == null){
        return;
    }

    html = '';

    html += '<div class="back-wrapper network-back">';
        html += '<a href="#" class="d-flex align-items-center"><img class="arrow" src="/img/ico_back.svg">Back</a>';
    html += '</div>';

    html += '<div class="container-network-detail-wrapper">';
        html += '<div class="network-detail-wrapper">';
            html += '<h2>'  + selected_asset.name + '</h2>';
        html += '</div>';

        html += '<h4>Cities</h4>';

        html += '<div class="network-cities">';
            html += '<ul>';

            var cities = [];
            for(var index in initial_data.cities) {
                var city = initial_data.cities[index];
                var city_assets = city.assets;
                for(var index2 in city_assets) {
                    if(city_assets[index2].asset_category_id == selected_asset.id){
                        var city_marker = find_marker_by_id(city.id);
                        if(typeof city_marker != "undefined"){
                            city_marker.setVisible(true);
                            //city_marker.setIcon(marker_generic_selected);
                            if(city_marker.keypoint != null){
                                if(cities.indexOf(city_marker.keypoint.idCity) == -1){
                                    html += '<li><a href="#" data-city_id="' + city_marker.keypoint.idCity + '" data-id="' + city_marker.keypoint.id + '">' + city_marker.keypoint.nameCity + '</a></li>';
                                    cities.push(city_marker.keypoint.idCity);
                                }
                            }
                        }
                        
                        continue;
                    }
                }
            }
    
            html += '</ul>';
        html += '</div>';
    html += '</div>';

    $("#sidebar-content").html(html);
}
$("#sidebar-content").on("click", ".assets-categories-wrapper li a", function(e){
    selected_asset = find_asset_category_by_id($(this).data("id"));
    handle_sidebar_asset_content();
    e.preventDefault();
});


$("#sidebar-content").on("click", ".networks-wrapper li a", function(e){

    simpleBar.getScrollElement().scrollTop = 0;

    for(var index in initial_data.networks) {
        var network = initial_data.networks[index];
        if(network.id == $(this).data("id")){

            if($(this).data("fromcity")){
                //selected_city = find_city_by_id($(this).data("fromcity"));
            }

            selected_network = network;
            handle_network_click();
            handle_sidebar_network_content();
            break;
        }
    }

    e.preventDefault();
});
$("#sidebar-content").on("mouseenter", ".networks-wrapper li a", function(e){
    for(var index in network_paths) {
        var network_path = network_paths[index].network;
        if(network_path.network.id == $(this).data("id")){
            if(current_infoWindow){
                current_infoWindow.close();
            }
            current_infoWindow = network_path.infoWindow;
            if($(this).data("fromcity")){
                //selected_city = find_city_by_id($(this).data("fromcity"));
                current_infoWindow.setPosition({lat: parseFloat(selected_city.lat), lng: parseFloat(selected_city.lng)});
            }else{
                current_infoWindow.setPosition(network_path.getPath().getAt(0));
            }
            current_infoWindow.open(map);
            break;
        }
    }
});
$("#sidebar-content").on("mouseleave", ".networks-wrapper li a", function(e){
    if(current_infoWindow){
        current_infoWindow.close();
        current_infoWindow = null;
    }
});
$("#sidebar-content").on("click", ".network-back a", function(e){
    selected_network = null;
    if(selected_city){
        handle_sidebar_city_content(selected_city.id);
        selected_city = null;
    }else{
        reset_initial_state();
        return;
    }
    update_path_options();
    search_on = false;
    $(".cont-search input[name=search]").val("");
});

$("#sidebar-content").on("click", ".network-cities li a", function(e){

    for(var index in network_paths) {
        var markers = network_paths[index].markers;
        for(var index2 in markers){
            var marker = markers[index2];
            if(marker.keypoint.id == $(this).data("id")){
                selected_marker = marker;
                handle_marker_click();
                handle_sidebar_city_content($(this).data("city_id"));
                return;
            }
        }
    }

    e.preventDefault();
});
$("#sidebar-content").on("click", ".city-back a", function(e){

    if(selected_network != null){
        handle_sidebar_network_content();
        handle_change_map_bounds();
        update_path_options();
    }else if(selected_asset != null){
        handle_sidebar_asset_content();
    }else{
        reset_initial_state();
        return;
    }

    if(current_infoWindow){
        current_infoWindow.close();
        current_infoWindow = null;
    }
    
    search_on = false;
    $(".cont-search input[name=search]").val("");
});

$("#sidebar-content").on("mouseenter", ".network-cities a, .city-wrapper a", function(e){
    for(var index in network_paths) {
        var markers = network_paths[index].markers;
        for(var index2 in markers){
            var marker = markers[index2];
            if(marker.keypoint.id == $(this).data("id")){
                selected_marker = marker;
                handle_open_popup();
                return;
            }
        }
    }
});
$("#sidebar-content").on("mouseleave", ".network-cities a, .city-wrapper a", function(e){
    if(current_infoWindow){
        current_infoWindow.close();
        current_infoWindow = null;
    }
});

$(".logo-wrapper img.logo").on("click", function(e){
    reset_initial_state();
});

function reset_initial_state(){
    map.setOptions({styles: gmap_style_json});
    selected_network = null;
    selected_marker = null;
    update_path_options();

    if(current_infoWindow){
        current_infoWindow.close();
    }
    handle_sidebar_initial_content();
    handle_initial_bounds();

    simpleBar.getScrollElement().scrollTop = 0;

    search_on = false;
    $(".cont-search input[name=search]").val("");
}


function find_asset_category_by_id(asset_category_id){
    for(var index in initial_data.assets_categories) {
        var asset_category = initial_data.assets_categories[index];
        if(asset_category.id == asset_category_id){
            return asset_category;
        }
    }
    return false;
}

function find_solution_by_id(solution_id){
    for(var index in initial_data.solutions) {
        var solution = initial_data.solutions[index];
        if(solution.id == solution_id){
            return solution;
        }
    }
    return false;
}

function find_platform_by_id(platform_id){
    for(var index in initial_data.platforms) {
        var platform = initial_data.platforms[index];
        if(platform.id == platform_id){
            return platform;
        }
    }
    return false;
}

function find_city_by_id(city_id){
    for(var index in initial_data.cities) {
        var city = initial_data.cities[index];
        if(city.id == city_id){
            return city;
        }
    }
    return false;
}

function hide_all_components(){

    selected_network = null;
    selected_marker = null;

    for(var index in network_paths) {
        var network_path = network_paths[index].network;

        var path_property = network_path.network.paths_properties[network_path.parent_id];
        var dashed = path_property.dashed;
        var network_color = path_property.color;

        handle_path_off(dashed, network_color, network_path);
    }

    if(current_infoWindow){
        current_infoWindow.close();
    }

    for(var index in network_paths) {
        var markers = network_paths[index].markers;
        for(var index2 in markers){
            var marker = markers[index2];
            marker.setVisible(false);
        }
    }
}

function find_marker_by_id(city_id){
    for(var index in network_paths) {
        var markers = network_paths[index].markers;
        for(var index2 in markers){
            var marker = markers[index2];
            if(marker.keypoint.idCity == city_id){
                return marker;
            }
        }
    }
}







var search_timeout;
$(".cont-search img.lens").on("click", function(e){
    clearTimeout(search_timeout);
    handle_search();
    e.preventDefault();
});
$(".cont-search input[name=search]").on("keydown", function(e){
    clearTimeout(search_timeout);
    search_timeout = setTimeout(function() {
        handle_search();
    }, 1000);
});
$( ".cont-search form" ).submit(function( event ) {
    clearTimeout(search_timeout);
    handle_search();
    event.preventDefault();
});
function handle_search(){

    if($(".cont-search input[name=search]").val().length <= 2){
        html = '';
        html += '<div class="back-wrapper search-back">';
            html += '<a href="#" class="d-flex align-items-center"><img class="arrow" src="/img/ico_back.svg">Back</a>';
        html += '</div>';
        html += '<div class="search-result">';
            html += '<h2>Minimum three letters</h2>';
        html += '</div>';
        $("#sidebar-content").html(html);
        return;
    }

    if(!$(".cont-search input[name=search]").val().match(/^[A-Za-z ]+$/)){
        html = '';
        html += '<div class="back-wrapper search-back">';
        html += '<a href="#" class="d-flex align-items-center"><img class="arrow" src="/img/ico_back.svg">Back</a>';
        html += '</div>';
        html += '<div class="search-result">';
        html += '<h2>Format not correct</h2>';
        html += '</div>';
        $("#sidebar-content").html(html);
        return;
    }


    $.ajax({ 
        type: 'GET', 
        url: '/' + vars.routes.search.path + "?s=" + $(".cont-search input[name=search]").val(),
        success: function (data) {
            search_results =  JSON.parse(data);

            var count_solution = 0;
            var count_city = 0;
            for(var index in search_results) {
                var search_item = search_results[index];
                if(search_item.type == "SOLUTION_FAKEFAKE"){
                    count_solution++;
                }
                if(search_item.type == "CITY"){
                    count_city++;
                }
            }

            html = '';

            html += '<div class="back-wrapper search-back">';
                html += '<a href="#" class="d-flex align-items-center"><img class="arrow" src="/img/ico_back.svg">Back</a>';
            html += '</div>';

            html += '<div class="search-result">';
                if (count_solution == 0 && count_city == 0) {
                    html += '<h2>No results for "' + $(".cont-search input[name=search]").val() + '"</h2>';
                } else {
                    html += '<h2>Results for "' + $(".cont-search input[name=search]").val() + '"</h2>';

                    if (count_solution > 0){
                        html += '<div class="city-wrapper">';
                            html += '<h4>Solutions</h4>';
                            html += '<ul>';
                            for(var index in search_results) {
                                var search_item = search_results[index];
                                if(search_item.type == "SOLUTION"){
                                    var solution = find_solution_by_id(search_item.entity_id);
                                    var url = "#";
                                    if(solution.url){
                                        url = solution.url;
                                    }
                                    html += '<li>';
                                        html += '<a href="' + url + '" data-id="' + search_item.entity_id + '">' + search_item.name + '</a>';
                                    html += '</li>';   
                                }
                            }
                            html += '</ul>';
                        html += '</div>';                            
                    }

                    if (count_city > 0){

                        var bounds = new google.maps.LatLngBounds();

                        if (count_solution > 0){
                            html += '<hr>';
                        }

                        html += '<div class="city-wrapper network-cities">';
                            html += '<h4>Cities</h4>';
                            html += '<ul>';
                            for(var index in search_results) {
                                var search_item = search_results[index];
                                if(search_item.type == "CITY"){
                                    var marker = find_marker_by_id(search_item.entity_id);
                                    var keypoint = marker.keypoint;
                                    if(keypoint.lat != null && keypoint.lng != null){
                                        bounds.extend(new google.maps.LatLng({lat: parseFloat(keypoint.lat), lng: parseFloat(keypoint.lng)}));
                                    }
                                    html += '<li>';
                                        html += '<a href="#" data-city_id="' + marker.keypoint.idCity + '" data-id="' + marker.keypoint.id + '">' + search_item.name + '</a>';
                                    html += '</li>';   
                                }
                            }
                            html += '</ul>';
                        html += '</div>';

                        map.fitBounds(bounds, 10);
                        hide_all_components();

                        for(var index in search_results) {
                            var search_item = search_results[index];
                            if(search_item.type == "CITY"){
                                var marker = find_marker_by_id(search_item.entity_id);
                                marker.setVisible(true);
                                //marker.setIcon(marker_generic_selected);
                            }
                        }

                    }
                }

            html += '</div>';

            $("#sidebar-content").html(html);
            
            search_on = true;
            selected_network = null;
            selected_asset = null;
        }
    });
}
$("#sidebar-content").on("click", ".search-result .city-wrapper li a", function(e){

    for(var index in network_paths) {
        var markers = network_paths[index].markers;
        for(var index2 in markers){
            var marker = markers[index2];
            if(marker.keypoint.id == $(this).data("id")){
                selected_marker = marker;
                handle_sidebar_city_content($(this).data("city_id"));
                break;
            }
        }
    }

    e.preventDefault();
});
$("#sidebar-content").on("click", ".search-back a", function(e){
    reset_initial_state();
});

});