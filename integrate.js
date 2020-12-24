/*
 * Copyright 2020 Jiří Janoušek <janousek.jiri@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

(function (Nuvola) {
  // Create media player component
  const player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  const PlaybackState = Nuvola.PlaybackState
  const PlayerAction = Nuvola.PlayerAction

  // Create new WebApp prototype
  const WebApp = Nuvola.$WebApp()

  // Initialization routines
  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)
    this.timeTotal = null

    const state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
  }

  // Page is ready for magic
  WebApp._onPageReady = function () {
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect('ActionActivated', this)

    // Start update routine
    this.update()
  }

  // Extract data from the web page
  WebApp.update = function () {
    const elms = this._getElements()
    const time = this._getTime()

    let state
    if (elms.pause) {
      state = PlaybackState.PLAYING
    } else if (elms.play) {
      state = PlaybackState.PAUSED
    } else {
      state = PlaybackState.UNKNOWN
    }
    player.setPlaybackState(state)

    const track = {
      title: Nuvola.queryAttribute('#adbl-cloud-player-container input[name="title"]', 'value'),
      artist: null,
      album: null,
      artLocation: Nuvola.queryAttribute('#adbl-cloud-player-product img', 'src'),
      rating: null,
      length: time[1]
    }

    player.setTrack(track)

    player.setCanGoPrev(!!elms.prev)
    player.setCanGoNext(!!elms.next)
    player.setCanPlay(!!elms.play)
    player.setCanPause(!!elms.pause)
    player.setTrackPosition(time[0])

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  // Handler of playback actions
  WebApp._onActionActivated = function (emitter, name, param) {
    const elms = this._getElements()
    switch (name) {
      case PlayerAction.TOGGLE_PLAY:
        if (elms.play) {
          Nuvola.clickOnElement(elms.play)
        } else {
          Nuvola.clickOnElement(elms.pause)
        }
        break
      case PlayerAction.PLAY:
        Nuvola.clickOnElement(elms.play)
        break
      case PlayerAction.PAUSE:
      case PlayerAction.STOP:
        Nuvola.clickOnElement(elms.pause)
        break
      case PlayerAction.PREV_SONG:
        Nuvola.clickOnElement(elms.prev)
        break
      case PlayerAction.NEXT_SONG:
        Nuvola.clickOnElement(elms.next)
        break
    }
  }

  WebApp._onNavigationRequest = function (object, request) {
    // Don't open the player in a new window
    if (request.url.startsWith('https://www.audible.com/webplayer')) {
      request.approved = true
      request.newWindow = false
    } else {
      Nuvola.WebApp._onNavigationRequest.call(this, object, request)
    }
  }

  WebApp._getElements = function () {
  // Interesting elements
    const elms = {
      play: document.querySelector('img.adblPlayButton'),
      pause: document.querySelector('img.adblPauseButton'),
      next: document.querySelector('img.adblNextChapter'),
      prev: document.querySelector('img.adblPreviousChapter')
    }

    // Ignore disabled buttons
    for (const key in elms) {
      if (elms[key] && elms[key].classList.contains('bc-hidden')) {
        elms[key] = null
      }
    }

    return elms
  }

  WebApp._getTime = function () {
    let elm = document.getElementById('adblMediaBarTimeSpent')
    const elapsed = elm ? Nuvola.parseTimeUsec(elm.textContent) : null
    elm = document.getElementById('adblMediaBarTimeLeft')
    const remaining = elm ? Nuvola.parseTimeUsec(elm.textContent.replace('– ', '')) : null
    const total = elapsed !== null && remaining != null ? elapsed + remaining : null

    if (total === null) {
      this.timeTotal = null
    } else if (this.timeTotal === null || Math.abs(this.timeTotal - total) > 1000000) {
      this.timeTotal = total
    }

    return [elapsed, this.timeTotal]
  }

  WebApp.start()
})(this) // function(Nuvola)
