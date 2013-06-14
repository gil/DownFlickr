(function() {

	"use strict";

	var apiUrl = "http://api.flickr.com/services/rest/?method=";
	var apiKeyParam = "&api_key=07e391a86e66960a7449ea81d0d9cd48";
	var perPage = "&per_page=30";
	var page = 1;
	var loadingCount = 0;

	// Get all picture sizes and create thumbnail
	function getPicture(id)
	{
		$.ajax({
			url: apiUrl + "flickr.photos.getSizes&photo_id=" + id + apiKeyParam,
			dataType: "xml",

			success: function(xml) {

				var size = $(xml).find("size");
				var thumbUrl = size.first().attr("source");
				var bigUrl = size.last().attr("source");

				if( thumbUrl && bigUrl )
				{

					var img = $("<img/>")
						.attr("src", thumbUrl);

					var link = $("<a/>")
						.on("click", function() {

							// Used to, maybe, replace the URL when clicking with the download URL
							link.attr( "href", getPhotoURL( link.attr("href") ) );

						})
						.attr({
							"href" : bigUrl,
							"target" : "_blank"
						})
						.append( img )
						.appendTo( $("#imgContainer") );

					stopLoading();

				}

			},

			error: function() {
				stopLoading();
			}

		});

		$("#actions, #imgContainer, #disclaimer").show();
		startLoading();
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
				imgs.push( getPhotoURL( $(this).parent().attr("href") ) );
			});

			if( imgs.length > 0 )
			{
				chrome.extension.sendRequest({
					msg: "openAllPhotos",
					imgs: imgs,
					autoDownload: shouldAutoDownload()
				});
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
			}
			// Photo
			else if( urlParts.length >= 6 )
			{
				$("#photoId").attr("value", urlParts[5]);
			}

		}

	});

})();