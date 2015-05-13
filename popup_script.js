(function() {

	"use strict";

	var apiUrl = "https://api.flickr.com/services/rest/?method=";
	var apiKeyParam = "&api_key=07e391a86e66960a7449ea81d0d9cd48";
	var perPage = "&per_page=30";
	var page = 1;
	var loadingCount = 0;

	// Get all picture sizes and create thumbnail
	function getPicture(id)
	{
		getPhotoSizes(id, function(id, thumbUrl, bigUrl) {
			getPhotoTitle(id, bigUrl, function(id, title) {
				renderThumb(id, thumbUrl, bigUrl, title);
				stopLoading();
			});
		});

		$("#actions, #imgContainer, #disclaimer").show();
		startLoading();
	}

	function getPhotoTitle(id, url, callback) {

		$.ajax({
			url: apiUrl + "flickr.photos.getInfo&photo_id=" + id + apiKeyParam,

			success: function(xml) {

				var title = $(xml).find("title");

				if( title != null && title.text() != "" ) {
					var urlParts = url.split(".");
					title = filenameSanitize((title.text() || "Untitled").trim(), "_") + "." + urlParts[urlParts.length - 1];
					title = title.split("?")[0];
				} else {
					title = undefined;
				}

				callback(id, title);

			},

			error: function() {
				callback(id, undefined);
			}
		});
	}

	function getPhotoSizes(id, callback) {

		$.ajax({
			url: apiUrl + "flickr.photos.getSizes&photo_id=" + id + apiKeyParam,
			dataType: "xml",

			success: function(xml) {

				var size = $(xml).find("size");
				var thumbUrl = size.first().attr("source");
				var bigUrl = size.last().attr("source");

				if( thumbUrl && bigUrl ) {
					callback(id, thumbUrl, bigUrl);
				}
			},

			error: function() {
				stopLoading();
			}

		});
	}

	function renderThumb(id, thumbUrl, bigUrl, title) {

		var img = $("<img/>").attr("src", thumbUrl);

		var link = $("<a/>")
			.on("click", function(e) {

				// Used to, maybe, replace the URL when clicking with the download URL to allow changing with/without "_d"
				link.attr( "href", getPhotoURL(bigUrl) );

				// Let's ignore default behaviour and use our code now
				openAllPhotos([{ url: getPhotoURL(bigUrl), filename: title }]);
				e.preventDefault();

			})
			.attr({
				"href" : bigUrl,
				"title" : title,
				"download" : title,
				"target" : "_blank"
			})
			.append( img )
			.appendTo( $("#imgContainer") );
	}

	// Get all pictures inside some Photoset
	function getPhotoset(id)
	{
		$(".loadMore").remove();

		$.ajax({
			url: apiUrl + "flickr.photosets.getPhotos&media=photos&photoset_id=" + id + perPage + "&page=" + page + apiKeyParam,
			dataType: "xml",

			success: function(xml) {

				$(xml).find("photo").each(function(){
					getPicture( $(this).attr("id") );
				});

				page++;
				$("#setOk").html("+30");

			}

		});
	}

	// Show loader
	function startLoading() {

		loadingCount++;
		$("#loading").show();
	}

	// Hide loader
	function stopLoading() {

		loadingCount--;

		if( loadingCount < 1 ) {
			$("#loading").hide();
			showLoadMore();
		}
	}

	// Show button to load more photos
	function showLoadMore() {

		if( page > 1 ) {

			$("<a/>")
				.text("Load 30 more...")
				.attr("href", "#")
				.on("click", function() {
					$("#setOk").click();
				})
				.addClass("loadMore")
				.appendTo( $("#imgContainer") );
		}
	}

	// Check if Auto Download is active
	function shouldAutoDownload() {
		return $("#download").is(":checked");
	}

	// Get the URL to open or download the big photo
	function getPhotoURL(url)
	{
		if( shouldAutoDownload() )
		{
			var urlArr = url.split(".");
			urlArr[urlArr.length - 2] += "_d";
			return urlArr.join(".");
		}

		return url;
	}

	function openAllPhotos(imgs) {

		chrome.extension.sendRequest({
			msg: "openAllPhotos",
			imgs: imgs,
			autoDownload: shouldAutoDownload()
		});
	}

	// Proper filename sanitizer, borrowed from: https://github.com/parshap/node-sanitize-filename
	var illegalRe = /[\/\?<>\\:\*\|":]/g;
	var controlRe = /[\x00-\x1f\x80-\x9f]/g;
	var reservedRe = /^\.+$/;
	var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
	var multipleSpaceRe = /\s+/g;

	function filenameSanitize(input, replacement) {
	  return input
	    .replace(illegalRe, replacement)
	    .replace(controlRe, replacement)
	    .replace(reservedRe, replacement)
	    .replace(windowsReservedRe, replacement)
	    .replace(multipleSpaceRe, " ");
	}

	// Button handlers
	$(document).ready(function()
	{
		// Photo "Load" button
		$("#photoOk").on("click", function()
		{
			if( $("#photoId").attr("value") )
			{
				getPicture( $("#photoId").attr("value") );
			}
		});

		// Set "Load" button
		$("#setOk").on("click", function()
		{
			if( $("#setId").attr("value") )
			{
				getPhotoset( $("#setId").attr("value") );
			}
		});

		// Reset the page and the Set button
		$("#setId").on("keydown", function() {
			page = 1;
			$("#setOk").html("Load");
		});

		// Open all photos
		$("#openAll").on("click", function()
		{
			var imgs = [];

			$("#imgContainer img").each(function() {
				var img = $(this).parent();
				imgs.push({
					url: getPhotoURL( img.attr("href") ),
					filename: img.attr("title")
				});
			});

			if( imgs.length > 0 ) {
				openAllPhotos(imgs);
				window.close();
			}
		});

		// Clear photos
		$("#clear").on("click", function()
		{
			page = 1;
			window.close();
			// $("#imgContainer").empty();
			// $("#setOk").html("Load");
		});

		// Change labels
		$("#open, #download").on("change", function() {
			$("#openAll").text( shouldAutoDownload() ? "Download all" : "Open all" )
		})
	});

	// Get the ID from the URL, when possible
	chrome.tabs.getSelected(null, function(tab) {

		if( tab.url.indexOf("flickr.com\/photos") > -1 )
		{
			var urlParts = tab.url.split("/");

			// Set
			if( urlParts[5] === "sets")
			{
				$("#setId").attr("value", urlParts[6]);
				$("#setOk").click();
			}
			// Photo
			else if( urlParts.length >= 6 )
			{
				$("#photoId").attr("value", urlParts[5]);
				$("#photoOk").click();
			}

		}

	});

})();