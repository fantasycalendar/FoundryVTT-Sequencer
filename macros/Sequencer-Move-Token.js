new Sequence()
    .animation()
        .on(canvas.tokens.controlled[0])
        .moveTowards(canvas.tokens.controlled[1])
		.closestSquare()
    .play();