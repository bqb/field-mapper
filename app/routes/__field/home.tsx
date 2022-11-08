import { prisma } from "~/utils/db.server";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  getUserSession,
  commitSession,
  requireUserId,
} from "~/utils/auth.server";
import { Layer } from "react-map-gl";

export const action: ActionFunction = async ({ request }) => {
  const session = await getUserSession(request);
  const { layerId } = Object.fromEntries(await request.formData());
  session.set("layerId", layerId);
  session.unset("viewState");
  return redirect(`/layers/${layerId}`, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const userLayers = await prisma.layer.findMany({
    where: {
      features: {
        some: {
          assignment: {
            is: {
              assigneeId: userId,
            },
          },
        },
      },
    },
    include: {
      features: {
        include: {
          assignment: true,
        },
      },
    },
  });
  return { userLayers, userId };
};

export default function HomePage() {
  const { userLayers, userId } = useLoaderData();
  const submit = useSubmit();

  const setLayer = (layerId: number) => {
    submit({ layerId: String(layerId) }, { method: "post" });
  };

  return (
    <div className="w-full h-full bg-ob bg-blend-multiply bg-gray-800 bg-top bg-no-repeat bg-cover bg-fixed">
      {userLayers && userLayers.length > 0 ? (
        <ul className="justify-center h-full w-full items-center flex flex-col space-y-6">
          {userLayers.map((layer, i) => (
            <li className="w-3/4" key={layer.id}>
              <div
                tabIndex={i}
                className="collapse mx-auto w-full collapse-arrow border border-gray-600 bg-gray-800 rounded-box"
              >
                <div className="collapse-title text-2xl">{layer.name}</div>
                <div className="collapse-content flex flex-row justify-evenly items-center w-full">
                  <div>
                    <div className="flex flex-row items-center space-x-1">
                      <span className="font-semibold text-lg">
                        {
                          layer.features.filter(
                            (f) =>
                              f.assignment && f.assignment.assigneeId == userId
                          ).length
                        }
                      </span>
                      <p>assignments</p>
                    </div>
                    <div className="flex flex-row items-center space-x-1">
                      <span className="font-semibold text-lg">
                        {
                          layer.features.filter(
                            (f) =>
                              f.assignment &&
                              f.assignment.assigneeId == userId &&
                              f.assignment.completed
                          ).length
                        }
                      </span>
                      <p>completed</p>
                    </div>
                  </div>
                  <button
                    className="btn bg-gray-400 text-white"
                    onClick={() => setLayer(layer.id)}
                  >
                    Map
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <h2 className='text-center pt-14'>No Assignments</h2>
      )}
    </div>
  );
}
