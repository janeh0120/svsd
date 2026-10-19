import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { linearTiming, springTiming, TransitionSeries } from "@remotion/transitions";
import React from "react";
import { Agent, Annotate, Outro, Prompt, Question, Title } from "./scenes";
import { ScreenClip } from "./ui";

const T = 14;

// [scene, frames]. Order follows the storyboard: prompt → draft → approve → animate → tweak → fine-tune.
const SCENES: [React.ReactNode, number][] = [
  [<Title />, 100],
  [<Prompt />, 130],
  [<Agent />, 175],
  [<Question />, 105],
  [<ScreenClip src="01-prompt-and-draft.mp4" start={10} cx={900} cy={320} zoom={1.25} zoomTo={1.4} caption="The storyboard fills in, act by act." />, 140],
  [<Annotate />, 160],
  [<ScreenClip src="03-point-and-tweak.mp4" start={2.6} cx={790} cy={230} zoom={1.8} zoomTo={1.95} caption="Only that element changes." />, 150],
  [<ScreenClip src="04-fine-tune.mp4" start={1.2} cx={1320} cy={520} zoom={1.9} to={[1320, 600]} caption="Fine-tune every cut by hand." />, 130],
  [<Outro />, 120],
];

export const REEL_FRAMES = SCENES.reduce((n, [, d]) => n + d, 0) - (SCENES.length - 1) * T;

export const Reel: React.FC = () => (
  <TransitionSeries>
    {SCENES.flatMap(([node, d], i) => [
      ...(i > 0
        ? [
            <TransitionSeries.Transition
              key={`t${i}`}
              presentation={i === 1 || i === SCENES.length - 1 ? fade() : slide({ direction: "from-right" })}
              timing={i === 1 || i === SCENES.length - 1 ? linearTiming({ durationInFrames: T }) : springTiming({ config: { damping: 200 }, durationInFrames: T })}
            />,
          ]
        : []),
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={d}>
        {node}
      </TransitionSeries.Sequence>,
    ])}
  </TransitionSeries>
);
