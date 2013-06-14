(function() {

	"use strict";

	var imagesWaiting,
		windowId,
		openTabs,
		openTabsCount,
		autoDownload;

	function cleanBeforeLoad() {

		imagesWaiting = [];
		openTabs = {};
		openTabsCount = 0;
	}

	function openNextImage() {

		if( imagesWaiting.length > 0 ) {

			// Not too many waiting or not auto downloading?
			if( openTabsCount < 5 || !autoDownload ) {

				chrome.tabs.create({
					windowId: windowId,
					url: imagesWaiting.shift(),
					active: false
				}, tabOpened);
			}

		} else {
			stopListeningForTabClose();
		}
	}

	function tabOpened(tab) {

		if( tab ) {
			openTabs[ tab.id ] = true;
			openTabsCount++;
			openNextImage();
		}
	}

	function listenForTabClose() {
		stopListeningForTabClose();
		chrome.tabs.onRemoved.addListener(tabClosed);
	}

	function stopListeningForTabClose() {
		chrome.tabs.onRemoved.removeListener(tabClosed);
	}

	function tabClosed(tabId, removeInfo) {

		if( openTabs[tabId] === true ) {

			delete openTabs[tabId];
			openTabsCount--;
			openNextImage();
		}
	}

	// Listen for request to open all photos
	chrome.extension.onRequest.addListener( function(request, sender, sendResponse)
	{
		if (request.msg === "openAllPhotos")
		{
			if( confirm("Are you sure you want to open " + request.imgs.length + " tab(s)? It may take a while to load everything.") )
			{
				// Open a new window with a blank page
				chrome.windows.create({url: "about:blank"}, function(win) {

					cleanBeforeLoad();

					windowId = win.id;
					autoDownload = request.autoDownload;
					imagesWaiting = request.imgs;

					if( autoDownload ) {
						listenForTabClose();
					}

					openNextImage();
				});
			}
		}
	});

})();